"use client";

import { Badge } from "@workspace/ui/components/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import { CodeBlock } from "./code-block";
import { Callout, Step } from "./docs-primitives";

// @latest so npx does not serve a stale cached build
const CLAUDE_CODE = `claude mcp add -s user lynq -- npx -y lynq-mcp@latest`;

const CONFIG_FILE = `{
  "mcpServers": {
    "lynq": {
      "command": "npx",
      "args": ["-y", "lynq-mcp@latest"]
    }
  }
}`;

const TOOL_GROUPS = [
  {
    title: "Setup",
    tools: [
      ["get_brand", "Widget settings and colours already in use"],
      ["list_departments", "Every department, with its id"],
      ["create_department", "Add a product or site"],
      ["get_embed_script", "Install snippet, optionally per department"],
    ],
  },
  {
    title: "Announcements",
    tools: [
      ["list_announcements", "Every banner and popup"],
      ["create_announcement", "Banner or popup, with image or video"],
      ["update_announcement", "Change an existing one"],
      ["publish_announcement", "Turn one on or off"],
      ["delete_announcement", "Remove one permanently"],
    ],
  },
  {
    title: "Surveys",
    tools: [
      ["list_surveys", "Every survey"],
      ["create_survey", "Rating, NPS or text survey"],
      ["get_survey_results", "Scores and comments"],
    ],
  },
] as const;

const TOOL_COUNT = TOOL_GROUPS.reduce(
  (total, group) => total + group.tools.length,
  0,
);

export const McpPanel = () => {
  return (
    <div className="space-y-5">
      <div className="rounded-xl border bg-background p-5 pb-0">
        <Step number={1} title="Add the server to your AI client">
          <Tabs defaultValue="claude-code">
            <TabsList className="h-auto gap-1 bg-transparent p-0">
              <TabsTrigger
                className="rounded-lg border bg-background px-3 py-1.5 text-xs data-[state=active]:border-primary/40 data-[state=active]:bg-primary/5 data-[state=active]:shadow-none"
                value="claude-code"
              >
                Claude Code
              </TabsTrigger>
              <TabsTrigger
                className="rounded-lg border bg-background px-3 py-1.5 text-xs data-[state=active]:border-primary/40 data-[state=active]:bg-primary/5 data-[state=active]:shadow-none"
                value="config"
              >
                Config file
              </TabsTrigger>
            </TabsList>
            <TabsContent className="mt-3" value="claude-code">
              <CodeBlock code={CLAUDE_CODE} label="Terminal" />
            </TabsContent>
            <TabsContent className="mt-3 space-y-2" value="config">
              <CodeBlock code={CONFIG_FILE} label="mcp.json" />
              <p className="text-muted-foreground text-xs">
                Claude Desktop, Codex, Cursor and anything else that reads an MCP
                config file.
              </p>
            </TabsContent>
          </Tabs>
        </Step>

        <Step number={2} title="Sign in once, in your browser">
          <p className="text-muted-foreground text-sm leading-relaxed">
            The first time it runs, a tab opens asking you to approve access to
            your Lynq account. Approve it and the sign-in is remembered — later
            runs go straight through.
          </p>
          <CodeBlock code="npx -y lynq-mcp@latest login" label="Terminal" />
          <p className="text-muted-foreground text-xs">
            Optional — running the command above signs you in ahead of time
            instead of on first use.
          </p>
        </Step>

        <Step isLast number={3} title="Ask for what you want">
          <div className="space-y-2">
            <div className="rounded-lg border bg-muted/40 p-3.5">
              <p className="text-sm italic">
                “Create a banner announcing our Black Friday sale, 30% off,
                ending Monday.”
              </p>
              <p className="mt-1.5 text-muted-foreground text-xs leading-relaxed">
                Reads your existing widget colours first, writes the copy, picks
                a matching palette, and publishes it.
              </p>
            </div>
            <div className="rounded-lg border bg-muted/40 p-3.5">
              <p className="text-sm italic">
                “Add a department for our warehouse site and give me the Next.js
                snippet to install it.”
              </p>
              <p className="mt-1.5 text-muted-foreground text-xs leading-relaxed">
                Creates the department and hands back a snippet already scoped to
                it, so that site only sees its own announcements and surveys.
              </p>
            </div>
            <div className="rounded-lg border bg-muted/40 p-3.5">
              <p className="text-sm italic">
                “Make a popup with this YouTube walkthrough of the new
                dashboard.”
              </p>
              <p className="mt-1.5 text-muted-foreground text-xs leading-relaxed">
                Popups can carry an image, a video file or a YouTube link, which
                plays inside the popup rather than sending visitors away.
              </p>
            </div>
          </div>
        </Step>
      </div>

      <div className="space-y-3 rounded-xl border bg-background p-5">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm">Available tools</p>
          <Badge className="font-mono text-[10px]" variant="secondary">
            {TOOL_COUNT}+
          </Badge>
        </div>
        <div className="space-y-3.5">
          {TOOL_GROUPS.map((group) => (
            <div className="space-y-1.5" key={group.title}>
              <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                {group.title}
              </p>
              <div className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
                {group.tools.map(([name, description]) => (
                  <div className="flex items-baseline gap-2 text-sm" key={name}>
                    <code className="font-mono text-[12px] text-primary">
                      {name}
                    </code>
                    <span className="truncate text-muted-foreground text-xs">
                      {description}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Callout title="Publishing is immediate" variant="warning">
        Asking the agent to publish makes an announcement visible to every
        visitor on every site running your widget, with no confirmation step. Ask
        for a draft first if you want to review it.
      </Callout>
    </div>
  );
};
