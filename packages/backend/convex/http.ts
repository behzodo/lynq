import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import {
  handleTelegramUpdate,
  TelegramUpdate,
} from "./lib/telegramHandler";

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
    const organizationId = new URL(request.url).searchParams.get(
      "organizationId",
    );

    if (!organizationId) {
      return json({ error: "Missing organizationId" }, 400);
    }

    const announcements = await ctx.runQuery(api.public.announcements.getActive, {
      organizationId,
    });

    return json({ announcements }, 200, {
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
    const organizationId = new URL(request.url).searchParams.get(
      "organizationId",
    );

    if (!organizationId) {
      return json({ error: "Missing organizationId" }, 400);
    }

    const surveys = await ctx.runQuery(api.public.surveys.getActive, {
      organizationId,
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

export default http;
