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

const TOOLS = [
  ["get_brand", "Widget settings and colours already in use"],
  ["list_announcements", "Every banner and popup"],
  ["create_announcement", "Create a banner or popup"],
  ["update_announcement", "Change an existing one"],
  ["publish_announcement", "Turn one on or off"],
  ["delete_announcement", "Remove one permanently"],
  ["list_surveys", "Every survey"],
  ["create_survey", "Rating, NPS or text survey"],
  ["get_survey_results", "Scores and comments"],
] as const;

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
          <div className="rounded-lg border bg-muted/40 p-3.5">
            <p className="text-sm italic">
              “Create a banner announcing our Black Friday sale, 30% off, ending
              Monday.”
            </p>
          </div>
          <p className="text-muted-foreground text-sm leading-relaxed">
            The agent reads your existing widget colours first, writes the copy,
            picks a matching palette, and publishes it.
          </p>
        </Step>
      </div>

      <div className="space-y-3 rounded-xl border bg-background p-5">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm">Available tools</p>
          <Badge className="font-mono text-[10px]" variant="secondary">
            {TOOLS.length}+
          </Badge>
        </div>
        <div className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
          {TOOLS.map(([name, description]) => (
            <div className="flex items-baseline gap-2 text-sm" key={name}>
              <code className="font-mono text-[12px] text-primary">{name}</code>
              <span className="truncate text-muted-foreground text-xs">
                {description}
              </span>
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
