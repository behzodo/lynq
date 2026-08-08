"use client";

import { Button } from "@workspace/ui/components/button";
import { CopyIcon, SparklesIcon } from "lucide-react";
import { toast } from "sonner";

const MCP_URL =
  process.env.NEXT_PUBLIC_MCP_URL || "https://lynq-web.vercel.app/mcp";

const CLAUDE_COMMAND = `claude mcp add lynq -- npx -y lynq-mcp`;

const CLIENT_CONFIG = `{
  "mcpServers": {
    "lynq": {
      "command": "npx",
      "args": ["-y", "lynq-mcp"]
    }
  }
}`;

export const McpPanel = () => {
  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <div className="space-y-6 rounded-lg border bg-background p-6">
      <div className="flex items-start gap-x-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <SparklesIcon className="size-5" />
        </div>
        <div>
          <h3 className="font-semibold">AI agents (MCP)</h3>
          <p className="text-muted-foreground text-sm">
            Connect Claude or Codex and ask it to write your banners, popups and
            surveys. You sign in with your Lynq account — no keys to copy.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <p className="font-medium text-sm">1. Add the server</p>
        <div className="relative">
          <pre className="overflow-x-auto rounded-md bg-foreground p-3 font-mono text-secondary text-xs">
            {CLAUDE_COMMAND}
          </pre>
          <Button
            className="absolute top-2 right-2 size-6"
            onClick={() => copy(CLAUDE_COMMAND, "Command")}
            size="icon"
            variant="secondary"
          >
            <CopyIcon className="size-3" />
          </Button>
        </div>
        <p className="text-muted-foreground text-xs">
          For clients that use a config file instead:
        </p>
        <div className="relative">
          <pre className="overflow-x-auto rounded-md bg-foreground p-3 font-mono text-secondary text-xs">
            {CLIENT_CONFIG}
          </pre>
          <Button
            className="absolute top-2 right-2 size-6"
            onClick={() => copy(CLIENT_CONFIG, "Config")}
            size="icon"
            variant="secondary"
          >
            <CopyIcon className="size-3" />
          </Button>
        </div>
      </div>

      <div className="space-y-1">
        <p className="font-medium text-sm">2. Sign in</p>
        <p className="text-muted-foreground text-sm">
          The first time it runs, a browser tab opens asking you to sign in to
          Lynq. Approve it once and it is remembered — no key to copy.
        </p>
      </div>

      <div className="space-y-1">
        <p className="font-medium text-sm">3. Ask for something</p>
        <p className="rounded-md bg-muted p-3 text-muted-foreground text-sm italic">
          “Create a banner announcing our Black Friday sale, 30% off, ending
          Monday.”
        </p>
      </div>

      <p className="text-muted-foreground text-xs">
        The agent acts as you, on the organizations you belong to. Publishing an
        announcement makes it visible to every visitor immediately.
      </p>
    </div>
  );
};
