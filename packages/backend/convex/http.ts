import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import {
  handleTelegramUpdate,
  TelegramUpdate,
} from "./lib/telegramHandler";
import { verifyWebhookSignature } from "./lib/github";

const http = httpRouter();

// Announcements and surveys are rendered by the embed script directly on
// customer sites, so these endpoints are public and must answer CORS
// preflights from any origin.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const json = (body: unknown, status = 200, extraHeaders: HeadersInit = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
      ...extraHeaders,
    },
  });

http.route({
  path: "/announcements",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const params = new URL(request.url).searchParams;
    const organizationId = params.get("organizationId");
    const departmentId = params.get("departmentId") ?? undefined;

    if (!organizationId) {
      return json({ error: "Missing organizationId" }, 400);
    }

    const announcements = await ctx.runQuery(api.public.announcements.getActive, {
      organizationId,
      departmentId,
    });

    return json({ announcements }, 200, {
      // Varies by department, so the cache key must include it
      "Cache-Control": "public, max-age=30",
    });
  }),
});

http.route({
  path: "/announcements",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders });
  }),
});

http.route({
  path: "/surveys",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const params = new URL(request.url).searchParams;
    const organizationId = params.get("organizationId");
    const departmentId = params.get("departmentId") ?? undefined;

    if (!organizationId) {
      return json({ error: "Missing organizationId" }, 400);
    }

    const surveys = await ctx.runQuery(api.public.surveys.getActive, {
      organizationId,
      departmentId,
    });

    return json({ surveys }, 200, { "Cache-Control": "public, max-age=30" });
  }),
});

http.route({
  path: "/surveys",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders });
  }),
});

http.route({
  path: "/survey-responses",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    let body: {
      surveyId?: string;
      score?: number;
      comment?: string;
      metadata?: { url?: string; userAgent?: string };
    };

    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }

    if (!body.surveyId) {
      return json({ error: "Missing surveyId" }, 400);
    }

    try {
      await ctx.runMutation(api.public.surveys.submitResponse, {
        surveyId: body.surveyId as Id<"surveys">,
        score: body.score,
        comment: body.comment,
        metadata: body.metadata,
      });
    } catch {
      return json({ error: "Could not submit response" }, 400);
    }

    return json({ ok: true });
  }),
});

http.route({
  path: "/survey-responses",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders });
  }),
});

// The embed script paints the launcher bubble before the widget iframe loads,
// so it needs the brand logo from the host page.
http.route({
  path: "/widget-settings",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const organizationId = new URL(request.url).searchParams.get(
      "organizationId",
    );

    if (!organizationId) {
      return json({ error: "Missing organizationId" }, 400);
    }

    const widgetSettings = await ctx.runQuery(
      api.public.widgetSettings.getByOrganizationId,
      { organizationId },
    );

    return json(
      { logoUrl: widgetSettings?.logoUrl ?? null },
      200,
      { "Cache-Control": "public, max-age=60" },
    );
  }),
});

http.route({
  path: "/widget-settings",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders });
  }),
});
/**
 * Telegram bot webhook. One route serves every organization - the secret
 * header Telegram echoes back tells us which bot (and org) is calling.
 *
 * Telegram retries on non-2xx, so failures we can't recover from still
 * answer 200 after logging.
 */
http.route({
  path: "/telegram/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const secret = request.headers.get("X-Telegram-Bot-Api-Secret-Token");

    if (!secret) {
      return new Response("Unauthorized", { status: 401 });
    }

    const integration = await ctx.runQuery(
      internal.system.telegram.getIntegrationByWebhookSecret,
      { webhookSecret: secret },
    );

    if (!integration) {
      return new Response("Unauthorized", { status: 401 });
    }

    if (!integration.isActive) {
      return new Response(null, { status: 200 });
    }

    let update: TelegramUpdate;

    try {
      update = (await request.json()) as TelegramUpdate;
    } catch {
      return new Response(null, { status: 200 });
    }

    try {
      await handleTelegramUpdate(ctx, integration, update);
    } catch (error) {
      // Always 200 so Telegram doesn't retry a request that will fail again
      console.error("Telegram webhook failed", error);
    }

    return new Response(null, { status: 200 });
  }),
});

/**
 * GitHub App webhook. One endpoint serves every installation; the signature
 * proves the call came from GitHub, and the delivery id makes replays harmless.
 *
 * Status flows GitHub -> Lynq only. Nothing here writes back to GitHub, which
 * is what keeps the two boards from updating each other in a loop.
 */
http.route({
  path: "/github/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // The raw body is what the signature covers, so read it as text first
    const rawBody = await request.text();

    const valid = await verifyWebhookSignature(
      rawBody,
      request.headers.get("X-Hub-Signature-256"),
    );

    if (!valid) {
      return new Response("Invalid signature", { status: 401 });
    }

    const event = request.headers.get("X-GitHub-Event") ?? "unknown";
    const deliveryId = request.headers.get("X-GitHub-Delivery");

    if (!deliveryId) {
      return new Response("Missing delivery id", { status: 400 });
    }

    const isNew = await ctx.runMutation(internal.system.github.claimDelivery, {
      deliveryId,
      event,
    });

    // Already handled: answer 200 so GitHub stops retrying
    if (!isNew) {
      return new Response(null, { status: 200 });
    }

    let payload: {
      action?: string;
      issue?: { node_id?: string; state?: string; state_reason?: string | null };
      installation?: { id?: number };
      projects_v2_item?: { content_node_id?: string };
      changes?: {
        field_value?: {
          field_name?: string;
          to?: { name?: string } | null;
        };
      };
    };

    try {
      payload = JSON.parse(rawBody);
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    try {
      if (event === "issues" && payload.issue?.node_id) {
        if (payload.action === "closed" || payload.action === "reopened") {
          await ctx.runMutation(internal.system.github.applyIssueState, {
            issueNodeId: payload.issue.node_id,
            issueState: payload.action === "closed" ? "closed" : "open",
            // "completed" vs "not_planned" is what separates a fix from a
            // duplicate or won't-do
            closedReason: payload.issue.state_reason ?? undefined,
          });
        }
      }

      if (
        event === "projects_v2_item" &&
        payload.action === "edited" &&
        payload.projects_v2_item?.content_node_id &&
        payload.changes?.field_value?.to?.name
      ) {
        await ctx.runMutation(internal.system.github.applyBoardColumn, {
          issueNodeId: payload.projects_v2_item.content_node_id,
          boardColumn: payload.changes.field_value.to.name,
        });
      }

      if (event === "installation" && payload.installation?.id) {
        if (payload.action === "deleted" || payload.action === "suspend") {
          await ctx.runMutation(
            internal.system.github.markInstallationRemoved,
            { installationId: payload.installation.id },
          );
        }
      }
    } catch (error) {
      console.error("GitHub webhook handler failed", error);
      // 500 so GitHub shows the failure in the delivery log and we can redeliver
      return new Response("Handler error", { status: 500 });
    }

    return new Response(null, { status: 200 });
  }),
});

export default http;
