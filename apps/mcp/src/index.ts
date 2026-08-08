#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/server";
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import { ConvexHttpClient } from "convex/browser";
// Zod 4: the SDK derives the JSON Schema the model sees from these
import * as z from "zod";

import { HEX_COLOR, LYNQ_API_KEY, LYNQ_CONVEX_URL } from "./config.js";

if (!LYNQ_API_KEY) {
  console.error(
    "LYNQ_API_KEY is not set. Create one in the Lynq dashboard under Setup & Integrations, then add it to your MCP config.",
  );
  process.exit(1);
}

const apiKey = LYNQ_API_KEY;
const convex = new ConvexHttpClient(LYNQ_CONVEX_URL);

const server = new McpServer({
  name: "lynq",
  version: "0.1.0",
});

const text = (value: unknown) => ({
  content: [
    {
      type: "text" as const,
      text:
        typeof value === "string" ? value : JSON.stringify(value, null, 2),
    },
  ],
});

/**
 * Convex reports application errors as ConvexError, whose payload sits on
 * `data` - `message` is only the generic "Server Error". Reading `data` is what
 * turns a dead end into something the agent can act on, e.g. "Invalid API key".
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

const color = (label: string) =>
  z
    .string()
    .regex(HEX_COLOR, `${label} must be a hex colour such as #1d4ed8`)
    .describe(`${label} as a hex colour, e.g. #1d4ed8`);

// ---------------------------------------------------------------- brand

server.registerTool(
  "get_brand",
  {
    description:
      "Read the organization's widget settings and the colours already in use. Call this first so new announcements match the existing look.",
    inputSchema: z.object({}),
  },
  async () => {
    try {
      return text(await convex.query("mcp/brand:get" as never, { apiKey } as never));
    } catch (error) {
      return failed(error);
    }
  },
);

// -------------------------------------------------------- announcements

const announcementShape = {
  type: z
    .enum(["banner", "popup"])
    .describe("banner sits along the top or bottom edge; popup is centered"),
  title: z.string().min(1).describe("Short headline, a few words"),
  message: z.string().min(1).describe("One or two sentences of body copy"),
  ctaLabel: z
    .string()
    .optional()
    .describe("Button text, e.g. 'Read the update'. Omit for no button."),
  ctaUrl: z
    .string()
    .url()
    .optional()
    .describe("Where the button links. Required if ctaLabel is set."),
  bgColor: color("Background colour"),
  textColor: color("Text colour"),
  position: z
    .enum(["top", "bottom"])
    .describe("Banner edge. Ignored for popups, which are always centered."),
  dismissible: z
    .boolean()
    .describe("Whether the visitor can close it"),
  isActive: z
    .boolean()
    .describe("true publishes it live to every visitor immediately"),
};

server.registerTool(
  "list_announcements",
  {
    description: "List every banner and popup, active or not.",
    inputSchema: z.object({}),
  },
  async () => {
    try {
      return text(
        await convex.query("mcp/announcements:getMany" as never, {
          apiKey,
        } as never),
      );
    } catch (error) {
      return failed(error);
    }
  },
);

server.registerTool(
  "create_announcement",
  {
    description:
      "Create a banner or popup. Setting isActive true publishes it to real visitors straight away.",
    inputSchema: z.object(announcementShape),
  },
  async (input) => {
    try {
      const id = await convex.mutation("mcp/announcements:create" as never, {
        apiKey,
        ...input,
      } as never);

      return text({ announcementId: id, published: input.isActive });
    } catch (error) {
      return failed(error);
    }
  },
);

server.registerTool(
  "update_announcement",
  {
    description:
      "Replace every field of an existing announcement. Pass the full set of values, not just the changed ones.",
    inputSchema: z.object({
      announcementId: z
        .string()
        .describe("Id from list_announcements"),
      ...announcementShape,
    }),
  },
  async (input) => {
    try {
      await convex.mutation("mcp/announcements:update" as never, {
        apiKey,
        ...input,
      } as never);

      return text(`Updated ${input.announcementId}`);
    } catch (error) {
      return failed(error);
    }
  },
);

server.registerTool(
  "publish_announcement",
  {
    description:
      "Turn an announcement on or off without touching its content.",
    inputSchema: z.object({
      announcementId: z.string(),
      isActive: z.boolean().describe("true shows it to visitors"),
    }),
  },
  async ({ announcementId, isActive }) => {
    try {
      await convex.mutation("mcp/announcements:setActive" as never, {
        apiKey,
        announcementId,
        isActive,
      } as never);

      return text(`${announcementId} is now ${isActive ? "live" : "paused"}`);
    } catch (error) {
      return failed(error);
    }
  },
);

server.registerTool(
  "delete_announcement",
  {
    description: "Permanently delete an announcement. This cannot be undone.",
    inputSchema: z.object({ announcementId: z.string() }),
  },
  async ({ announcementId }) => {
    try {
      await convex.mutation("mcp/announcements:remove" as never, {
        apiKey,
        announcementId,
      } as never);

      return text(`Deleted ${announcementId}`);
    } catch (error) {
      return failed(error);
    }
  },
);

// --------------------------------------------------------------- surveys

const surveyShape = {
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

server.registerTool(
  "list_surveys",
  {
    description: "List every survey, active or not.",
    inputSchema: z.object({}),
  },
  async () => {
    try {
      return text(
        await convex.query("mcp/surveys:getMany" as never, { apiKey } as never),
      );
    } catch (error) {
      return failed(error);
    }
  },
);

server.registerTool(
  "create_survey",
  {
    description:
      "Create a survey. Setting isActive true shows it to real visitors straight away.",
    inputSchema: z.object(surveyShape),
  },
  async (input) => {
    try {
      const id = await convex.mutation("mcp/surveys:create" as never, {
        apiKey,
        ...input,
      } as never);

      return text({ surveyId: id, published: input.isActive });
    } catch (error) {
      return failed(error);
    }
  },
);

server.registerTool(
  "update_survey",
  {
    description:
      "Replace every field of an existing survey. Pass the full set of values.",
    inputSchema: z.object({
      surveyId: z.string().describe("Id from list_surveys"),
      ...surveyShape,
    }),
  },
  async (input) => {
    try {
      await convex.mutation("mcp/surveys:update" as never, {
        apiKey,
        ...input,
      } as never);

      return text(`Updated ${input.surveyId}`);
    } catch (error) {
      return failed(error);
    }
  },
);

server.registerTool(
  "publish_survey",
  {
    description: "Turn a survey on or off without touching its content.",
    inputSchema: z.object({
      surveyId: z.string(),
      isActive: z.boolean(),
    }),
  },
  async ({ surveyId, isActive }) => {
    try {
      await convex.mutation("mcp/surveys:setActive" as never, {
        apiKey,
        surveyId,
        isActive,
      } as never);

      return text(`${surveyId} is now ${isActive ? "live" : "paused"}`);
    } catch (error) {
      return failed(error);
    }
  },
);

server.registerTool(
  "delete_survey",
  {
    description: "Permanently delete a survey. This cannot be undone.",
    inputSchema: z.object({ surveyId: z.string() }),
  },
  async ({ surveyId }) => {
    try {
      await convex.mutation("mcp/surveys:remove" as never, {
        apiKey,
        surveyId,
      } as never);

      return text(`Deleted ${surveyId}`);
    } catch (error) {
      return failed(error);
    }
  },
);

server.registerTool(
  "get_survey_results",
  {
    description:
      "Read response count, average score and comments for one survey.",
    inputSchema: z.object({ surveyId: z.string() }),
  },
  async ({ surveyId }) => {
    try {
      return text(
        await convex.query("mcp/surveys:getResults" as never, {
          apiKey,
          surveyId,
        } as never),
      );
    } catch (error) {
      return failed(error);
    }
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stdout is the protocol channel, so logs must go to stderr
  console.error(`Lynq MCP server running on stdio (${LYNQ_CONVEX_URL})`);
}

main().catch((error) => {
  console.error("Fatal error in Lynq MCP server:", error);
  process.exit(1);
});
