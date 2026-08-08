"use client";

import { api } from "@workspace/backend/_generated/api";
import { Id } from "@workspace/backend/_generated/dataModel";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { useMutation, useQuery } from "convex/react";
import {
  CopyIcon,
  KeyRoundIcon,
  Loader2Icon,
  PlusIcon,
  TrashIcon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const CONFIG_SNIPPET = (apiKey: string) => `{
  "mcpServers": {
    "lynq": {
      "command": "npx",
      "args": ["-y", "@lynq/mcp"],
      "env": {
        "LYNQ_API_KEY": "${apiKey}"
      }
    }
  }
}`;

export const McpPanel = () => {
  const apiKeys = useQuery(api.private.apiKeys.getMany);
  const createApiKey = useMutation(api.private.apiKeys.create);
  const removeApiKey = useMutation(api.private.apiKeys.remove);

  const [name, setName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  // Held in memory only - the key is never returned by a query again
  const [freshKey, setFreshKey] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Give the key a name");
      return;
    }

    setIsCreating(true);

    try {
      const key = await createApiKey({ name: name.trim() });
      setFreshKey(key);
      setName("");
      toast.success("API key created — copy it now, it won't be shown again");
    } catch {
      toast.error("Could not create API key");
    } finally {
      setIsCreating(false);
    }
  };

  const handleRemove = async (apiKeyId: Id<"apiKeys">) => {
    try {
      await removeApiKey({ apiKeyId });
      toast.success("API key revoked");
    } catch {
      toast.error("Could not revoke API key");
    }
  };

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
          <KeyRoundIcon className="size-5" />
        </div>
        <div>
          <h3 className="font-semibold">AI agents (MCP)</h3>
          <p className="text-muted-foreground text-sm">
            Connect Claude or Codex so it can write and publish your banners,
            popups and surveys
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="api-key-name">Create an API key</Label>
        <div className="flex items-center gap-x-2">
          <Input
            id="api-key-name"
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Claude Desktop"
            value={name}
          />
          <Button disabled={isCreating} onClick={handleCreate}>
            {isCreating ? (
              <Loader2Icon className="animate-spin" />
            ) : (
              <PlusIcon />
            )}
            Create
          </Button>
        </div>
      </div>

      {freshKey && (
        <div className="space-y-2 rounded-md border border-primary/30 bg-primary/5 p-4">
          <p className="font-medium text-sm">
            Copy this key now — it is not shown again
          </p>
          <div className="flex items-center gap-x-2">
            <code className="flex-1 truncate rounded bg-background px-2 py-1 font-mono text-xs">
              {freshKey}
            </code>
            <Button
              onClick={() => copy(freshKey, "API key")}
              size="icon"
              variant="outline"
            >
              <CopyIcon className="size-3" />
            </Button>
          </div>

          <p className="pt-2 font-medium text-sm">
            Add this to your Claude or Codex MCP config
          </p>
          <div className="relative">
            <pre className="overflow-x-auto rounded-md bg-foreground p-3 font-mono text-secondary text-xs">
              {CONFIG_SNIPPET(freshKey)}
            </pre>
            <Button
              className="absolute top-2 right-2 size-6"
              onClick={() => copy(CONFIG_SNIPPET(freshKey), "Config")}
              size="icon"
              variant="secondary"
            >
              <CopyIcon className="size-3" />
            </Button>
          </div>
        </div>
      )}

      {apiKeys === undefined ? (
        <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
      ) : apiKeys.length === 0 ? (
        <p className="text-muted-foreground text-sm">No API keys yet</p>
      ) : (
        <div className="divide-y rounded-md border">
          {apiKeys.map((apiKey) => (
            <div
              className="flex items-center justify-between gap-x-4 p-3"
              key={apiKey._id}
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-sm">{apiKey.name}</p>
                <p className="truncate font-mono text-muted-foreground text-xs">
                  {apiKey.preview}
                  {apiKey.lastUsedAt
                    ? ` · last used ${new Date(apiKey.lastUsedAt).toLocaleDateString()}`
                    : " · never used"}
                </p>
              </div>
              <Button
                onClick={() => handleRemove(apiKey._id)}
                size="icon"
                variant="ghost"
              >
                <TrashIcon className="size-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
