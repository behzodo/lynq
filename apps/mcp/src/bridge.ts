import { createInterface } from "node:readline";

import { getAccessToken, reauthenticate } from "./auth.js";
import { REMOTE_MCP_URL } from "./config.js";

/**
 * Bridges the MCP client's stdio transport to the hosted Streamable HTTP
 * endpoint, attaching the OAuth token. The client never sees the auth flow -
 * from its side this is an ordinary local stdio server.
 */
export async function runBridge() {
  let accessToken = await getAccessToken();
  // Set by the server on initialize; every later request must echo it back
  let sessionId: string | undefined;

  const write = (message: unknown) => {
    process.stdout.write(`${JSON.stringify(message)}\n`);
  };

  const post = (body: string, token: string) =>
    fetch(REMOTE_MCP_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // The server may answer with either, so accept both
        Accept: "application/json, text/event-stream",
        Authorization: `Bearer ${token}`,
        ...(sessionId ? { "Mcp-Session-Id": sessionId } : {}),
      },
      body,
    });

  const forward = async (line: string) => {
    let response = await post(line, accessToken);

    // An expired token looks like a 401 with a Bearer challenge. Refresh once
    // and replay before surfacing anything to the client.
    if (response.status === 401) {
      accessToken = await reauthenticate();
      response = await post(line, accessToken);
    }

    const returnedSessionId = response.headers.get("mcp-session-id");

    if (returnedSessionId) {
      sessionId = returnedSessionId;
    }

    // Notifications and responses the server chose not to answer
    if (response.status === 202 || response.status === 204) {
      return;
    }

    const contentType = response.headers.get("content-type") ?? "";
    const text = await response.text();

    if (!response.ok) {
      let id: unknown = null;

      try {
        id = JSON.parse(line)?.id ?? null;
      } catch {
        // Unparseable input, answer without an id
      }

      write({
        jsonrpc: "2.0",
        id,
        error: {
          code: -32000,
          message: `Lynq server returned ${response.status}: ${text.slice(0, 300)}`,
        },
      });
      return;
    }

    if (!text.trim()) {
      return;
    }

    if (contentType.includes("text/event-stream")) {
      // Each SSE `data:` line carries one JSON-RPC message
      for (const chunk of text.split(/\r?\n\r?\n/)) {
        for (const rawLine of chunk.split(/\r?\n/)) {
          if (!rawLine.startsWith("data:")) continue;

          const payload = rawLine.slice(5).trim();

          if (!payload || payload === "[DONE]") continue;

          try {
            write(JSON.parse(payload));
          } catch {
            // Ignore keep-alives and anything that is not JSON
          }
        }
      }
      return;
    }

    try {
      write(JSON.parse(text));
    } catch {
      // Nothing useful to relay
    }
  };

  const input = createInterface({ input: process.stdin });

  for await (const line of input) {
    if (!line.trim()) continue;

    try {
      await forward(line);
    } catch (error) {
      console.error("Lynq bridge error:", error);
    }
  }
}
