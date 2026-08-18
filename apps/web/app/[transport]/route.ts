import { api } from "@workspace/backend/_generated/api";
import type { Id } from "@workspace/backend/_generated/dataModel";
import { ConvexHttpClient } from "convex/browser";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { createMcpHandler, withMcpAuth } from "mcp-handler";
// Aliased Zod 4: the MCP SDK derives tool schemas from it, while the rest of
// the app stays on Zod 3 for react-hook-form
import * as z from "zod4";

import {
  listUserOrganizations,
  resolveOrganizationId,
} from "@/modules/mcp/organizations";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * Shared secret between this route and Convex. The Convex endpoints are open to
 * the internet, so this - not the organization id, which is caller-supplied -
 * is what authorizes them. The user's right to that organization is verified
 * here, before the call is made.
 */
const secret = process.env.MCP_BACKEND_SECRET!;

/** Clerk instance that issues the OAuth tokens we accept. */
const CLERK_ISSUER =
  process.env.CLERK_JWT_ISSUER_DOMAIN || "https://clerk.korvians.online";

/** Hex colour, 3 or 6 digits, rendered straight into CSS by the widget. */
const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/**
 * A CTA target: any scheme followed by "://" and something to go to. The
 * scheme is left open on purpose, because an announcement shown inside an app
 * wants a deep link ("stok://product/123") rather than a web address.
 */
const LINK = /^[a-z][a-z0-9+.-]*:\/\/\S+$/i;

const color = (label: string) =>
  z
    .string()
    .regex(HEX_COLOR, `${label} must be a hex colour such as #1d4ed8`)
    .describe(`${label} as a hex colour, e.g. #1d4ed8`);

const organizationId = z
  .string()
  .optional()
  .describe(
    "Only needed when the account belongs to more than one organization",
  );

const text = (value: unknown) => ({
  content: [
    {
      type: "text" as const,
      text: typeof value === "string" ? value : JSON.stringify(value, null, 2),
    },
  ],
});

/**
 * Convex reports application errors as ConvexError, whose payload sits on
 * `data`; `message` is only the generic "Server Error". Surfacing `data` is
 * what lets the agent correct itself rather than hit a dead end.
 */
const failed = (error: unknown) => {
  const data = (error as { data?: unknown })?.data;

  let detail: string;

  if (data && typeof data === "object" && "message" in data) {
    detail = String((data as { message: unknown }).message);
  } else if (data) {
    detail = typeof data === "string" ? data : JSON.stringify(data);
  } else {
    detail = error instanceof Error ? error.message : String(error);
  }

  return {
    isError: true,
    content: [{ type: "text" as const, text: `Failed: ${detail}` }],
  };
};

type ToolResult = ReturnType<typeof text> | ReturnType<typeof failed>;

/**
 * Clerk hangs the verified identity off the request context. Its exact position
 * has moved between SDK versions, so read both known shapes.
 */
function userIdFrom(ctx: unknown): string | undefined {
  const candidate = ctx as
    | {
        authInfo?: { extra?: { userId?: string } };
        http?: { authInfo?: { extra?: { userId?: string } } };
      }
    | undefined;

  return (
    candidate?.authInfo?.extra?.userId ??
    candidate?.http?.authInfo?.extra?.userId
  );
}

/**
 * Every tool needs the same preamble: identify the caller, then decide which
 * organization to act on. Wrapping it once keeps the tools themselves readable
 * and means no tool can accidentally skip the membership check.
 */
function tool<A extends { organizationId?: string }>(
  run: (args: A, orgId: string) => Promise<ToolResult>,
) {
  return async (args: A, ctx: unknown): Promise<ToolResult> => {
    const userId = userIdFrom(ctx);

    if (!userId) {
      return failed(new Error("Not authenticated"));
    }

    const resolved = await resolveOrganizationId(userId, args?.organizationId);

    if ("error" in resolved) {
      return failed(new Error(resolved.error));
    }

    try {
      return await run(args, resolved.organizationId);
    } catch (error) {
      return failed(error);
    }
  };
}

/**
 * Shared by announcements and surveys. Omitted means organization-wide, which
 * is the safe default: it behaves exactly as it did before departments.
 */
const departmentId = z
  .string()
  .optional()
  .describe(
    "Id from list_departments. Omit to show on every site in the organization.",
  );

/**
 * The agent hands us a plain string. Convex validates that it really is a
 * department id, and the mutation re-checks it belongs to this organization,
 * so the cast only bridges the type systems.
 */
const asDepartmentId = (value?: string) =>
  value ? (value as Id<"departments">) : undefined;

/**
 * Which surfaces this shows on. Omitted means all of them, so an agent that
 * doesn't mention platforms gets the old behaviour.
 */
const platforms = z
  .array(z.enum(["web", "ios", "android"]))
  .optional()
  .describe(
    "Surfaces to show on. Omit for every surface. Use this to keep an app-only message out of the website, or the other way round.",
  );

const announcementFields = {
  departmentId,
  platforms,
  type: z
    .enum(["banner", "popup"])
    .describe("banner sits along the top or bottom edge; popup is centered"),
  title: z.string().min(1).describe("Short headline, a few words"),
  message: z.string().min(1).describe("One or two sentences of body copy"),
  ctaLabel: z.string().optional().describe("Button text. Omit for no button."),
  ctaUrl: z
    .string()
    .regex(LINK, "Must be a link such as https://... or myapp://product/123")
    .optional()
    .describe(
      "Where the button links. Required if ctaLabel is set. Use https:// for the web, or an app deep link such as myapp://product/123 to open a screen inside the app.",
    ),
  bgColor: color("Background colour"),
  textColor: color("Text colour"),
  position: z
    .enum(["top", "bottom"])
    .describe("Banner edge. Ignored for popups, which are always centered."),
  dismissible: z.boolean().describe("Whether the visitor can close it"),
  isActive: z
    .boolean()
    .describe("true publishes it live to every visitor immediately"),
};

const surveyFields = {
  departmentId,
  platforms,
  title: z.string().min(1).describe("Internal name for the survey"),
  question: z.string().min(1).describe("The question shown to the visitor"),
  type: z
    .enum(["rating", "nps", "text"])
    .describe("rating = 1-5 stars, nps = 0-10 scale, text = free text only"),
  commentLabel: z
    .string()
    .optional()
    .describe("Label above the optional comment box"),
  thankYouMessage: z.string().min(1).describe("Shown after submitting"),
  bgColor: color("Background colour"),
  textColor: color("Text colour"),
  position: z.enum(["bottom-right", "bottom-left", "center"]),
  delaySeconds: z
    .number()
    .int()
    .min(0)
    .max(600)
    .describe("How long to wait before showing it"),
  isActive: z.boolean().describe("true publishes it live immediately"),
};

type AnnouncementInput = z.infer<z.ZodObject<typeof announcementFields>> & {
  organizationId?: string;
};
type SurveyInput = z.infer<z.ZodObject<typeof surveyFields>> & {
  organizationId?: string;
};

const handler = createMcpHandler((server) => {
  // ------------------------------------------------------------ context

  server.registerTool(
    "list_organizations",
    {
      description:
        "List the organizations this account can manage. Needed only when there is more than one.",
      inputSchema: z.object({}),
    },
    async (_args: unknown, ctx: unknown): Promise<ToolResult> => {
      const userId = userIdFrom(ctx);

      if (!userId) {
        return failed(new Error("Not authenticated"));
      }

      try {
        return text(await listUserOrganizations(userId));
      } catch (error) {
        return failed(error);
      }
    },
  );

  server.registerTool(
    "get_brand",
    {
      description:
        "Read the widget settings and the colours already in use. Call this first so new announcements match the existing look.",
      inputSchema: z.object({ organizationId }),
    },
    tool(async (_args: { organizationId?: string }, orgId) =>
      text(
        await convex.query(api.mcp.brand.get, {
          secret,
          organizationId: orgId,
        }),
      ),
    ),
  );

  server.registerTool(
    "list_departments",
    {
      description:
        "List the departments (separate products or sites) in this organization. Call this before creating an announcement or survey meant for only one of them.",
      inputSchema: z.object({ organizationId }),
    },
    tool(async (_args: { organizationId?: string }, orgId) =>
      text(
        await convex.query(api.mcp.departments.getMany, {
          secret,
          organizationId: orgId,
        }),
      ),
    ),
  );

  // ------------------------------------------------------ announcements

  server.registerTool(
    "list_announcements",
    {
      description: "List every banner and popup, active or not.",
      inputSchema: z.object({ organizationId }),
    },
    tool(async (_args: { organizationId?: string }, orgId) =>
      text(
        await convex.query(api.mcp.announcements.getMany, {
          secret,
          organizationId: orgId,
        }),
      ),
    ),
  );

  server.registerTool(
    "create_announcement",
    {
      description:
        "Create a banner or popup. Setting isActive true publishes it to real visitors straight away.",
      inputSchema: z.object({ ...announcementFields, organizationId }),
    },
    tool(async (args: AnnouncementInput, orgId) => {
      const { organizationId: _ignored, ...fields } = args;

      const id = await convex.mutation(api.mcp.announcements.create, {
        secret,
        organizationId: orgId,
        ...fields,
        departmentId: asDepartmentId(fields.departmentId),
      });

      return text({ announcementId: id, published: fields.isActive });
    }),
  );

  server.registerTool(
    "update_announcement",
    {
      description:
        "Replace every field of an existing announcement. Pass the full set of values, not just the changed ones.",
      inputSchema: z.object({
        announcementId: z.string().describe("Id from list_announcements"),
        ...announcementFields,
        organizationId,
      }),
    },
    tool(
      async (
        args: AnnouncementInput & { announcementId: string },
        orgId,
      ) => {
        const {
          organizationId: _ignored,
          announcementId,
          ...fields
        } = args;

        await convex.mutation(api.mcp.announcements.update, {
          secret,
          organizationId: orgId,
          announcementId: announcementId as never,
          ...fields,
          departmentId: asDepartmentId(fields.departmentId),
        });

        return text(`Updated ${announcementId}`);
      },
    ),
  );

  server.registerTool(
    "publish_announcement",
    {
      description:
        "Turn an announcement on or off without touching its content.",
      inputSchema: z.object({
        announcementId: z.string().describe("Id from list_announcements"),
        isActive: z.boolean().describe("true shows it to visitors"),
        organizationId,
      }),
    },
    tool(
      async (
        args: {
          announcementId: string;
          isActive: boolean;
          organizationId?: string;
        },
        orgId,
      ) => {
        await convex.mutation(api.mcp.announcements.setActive, {
          secret,
          organizationId: orgId,
          announcementId: args.announcementId as never,
          isActive: args.isActive,
        });

        return text(
          `${args.announcementId} is now ${args.isActive ? "live" : "paused"}`,
        );
      },
    ),
  );

  server.registerTool(
    "delete_announcement",
    {
      description: "Permanently delete an announcement. This cannot be undone.",
      inputSchema: z.object({
        announcementId: z.string(),
        organizationId,
      }),
    },
    tool(
      async (
        args: { announcementId: string; organizationId?: string },
        orgId,
      ) => {
        await convex.mutation(api.mcp.announcements.remove, {
          secret,
          organizationId: orgId,
          announcementId: args.announcementId as never,
        });

        return text(`Deleted ${args.announcementId}`);
      },
    ),
  );

  // ------------------------------------------------------------ surveys

  server.registerTool(
    "list_surveys",
    {
      description: "List every survey, active or not.",
      inputSchema: z.object({ organizationId }),
    },
    tool(async (_args: { organizationId?: string }, orgId) =>
      text(
        await convex.query(api.mcp.surveys.getMany, {
          secret,
          organizationId: orgId,
        }),
      ),
    ),
  );

  server.registerTool(
    "create_survey",
    {
      description:
        "Create a survey. Setting isActive true shows it to real visitors straight away.",
      inputSchema: z.object({ ...surveyFields, organizationId }),
    },
    tool(async (args: SurveyInput, orgId) => {
      const { organizationId: _ignored, ...fields } = args;

      const id = await convex.mutation(api.mcp.surveys.create, {
        secret,
        organizationId: orgId,
        ...fields,
        departmentId: asDepartmentId(fields.departmentId),
      });

      return text({ surveyId: id, published: fields.isActive });
    }),
  );

  server.registerTool(
    "update_survey",
    {
      description:
        "Replace every field of an existing survey. Pass the full set of values.",
      inputSchema: z.object({
        surveyId: z.string().describe("Id from list_surveys"),
        ...surveyFields,
        organizationId,
      }),
    },
    tool(async (args: SurveyInput & { surveyId: string }, orgId) => {
      const { organizationId: _ignored, surveyId, ...fields } = args;

      await convex.mutation(api.mcp.surveys.update, {
        secret,
        organizationId: orgId,
        surveyId: surveyId as never,
        ...fields,
        departmentId: asDepartmentId(fields.departmentId),
      });

      return text(`Updated ${surveyId}`);
    }),
  );

  server.registerTool(
    "publish_survey",
    {
      description: "Turn a survey on or off without touching its content.",
      inputSchema: z.object({
        surveyId: z.string(),
        isActive: z.boolean(),
        organizationId,
      }),
    },
    tool(
      async (
        args: { surveyId: string; isActive: boolean; organizationId?: string },
        orgId,
      ) => {
        await convex.mutation(api.mcp.surveys.setActive, {
          secret,
          organizationId: orgId,
          surveyId: args.surveyId as never,
          isActive: args.isActive,
        });

        return text(
          `${args.surveyId} is now ${args.isActive ? "live" : "paused"}`,
        );
      },
    ),
  );

  server.registerTool(
    "delete_survey",
    {
      description: "Permanently delete a survey. This cannot be undone.",
      inputSchema: z.object({ surveyId: z.string(), organizationId }),
    },
    tool(
      async (args: { surveyId: string; organizationId?: string }, orgId) => {
        await convex.mutation(api.mcp.surveys.remove, {
          secret,
          organizationId: orgId,
          surveyId: args.surveyId as never,
        });

        return text(`Deleted ${args.surveyId}`);
      },
    ),
  );

  server.registerTool(
    "get_survey_results",
    {
      description:
        "Read response count, average score and comments for one survey.",
      inputSchema: z.object({ surveyId: z.string(), organizationId }),
    },
    tool(async (args: { surveyId: string; organizationId?: string }, orgId) =>
      text(
        await convex.query(api.mcp.surveys.getResults, {
          secret,
          organizationId: orgId,
          surveyId: args.surveyId as never,
        }),
      ),
    ),
  );
});

/**
 * Clerk's own OAuth-token verification needs @clerk/nextjs v7; this app is on
 * v6, where `acceptsToken: "oauth_token"` silently fails to authenticate. As an
 * OAuth resource server all we owe the spec is proof the token is genuine, so
 * verify it locally against Clerk's published keys instead.
 */
const JWKS = createRemoteJWKSet(
  new URL(`${CLERK_ISSUER}/.well-known/jwks.json`),
);

async function verifyOAuthToken(token: string) {
  const { payload } = await jwtVerify(token, JWKS, {
    issuer: CLERK_ISSUER,
    // Clerk stamps OAuth access tokens with this type; refusing anything else
    // stops a session or ID token being replayed here
    typ: "at+jwt",
  });

  if (!payload.sub) {
    return undefined;
  }

  return {
    token,
    clientId: typeof payload.client_id === "string" ? payload.client_id : "",
    scopes:
      typeof payload.scope === "string" ? payload.scope.split(" ").filter(Boolean) : [],
    // requireBearerAuth rejects a token whose expiry is unset
    expiresAt: typeof payload.exp === "number" ? payload.exp : undefined,
    extra: { userId: String(payload.sub) },
  };
}

const authHandler = withMcpAuth(
  handler,
  async (_request: Request, token?: string) => {
    // No token at all: let withMcpAuth answer with the 401 challenge that
    // kicks off the client's OAuth flow
    if (!token) {
      return undefined;
    }

    try {
      return await verifyOAuthToken(token);
    } catch {
      // Bad signature, wrong issuer, expired: same 401 challenge
      return undefined;
    }
  },
  {
    required: true,
    resourceMetadataPath: "/.well-known/oauth-protected-resource/mcp",
  },
);

export { authHandler as GET, authHandler as POST, authHandler as DELETE };
