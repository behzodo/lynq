#!/usr/bin/env node
import { clearCredentials, getAccessToken, login } from "./auth.js";
import { runBridge } from "./bridge.js";
import { REMOTE_MCP_URL } from "./config.js";

const command = process.argv[2];

async function main() {
  switch (command) {
    case "login": {
      await login();
      return;
    }

    case "logout": {
      clearCredentials();
      console.error("Signed out of Lynq.");
      return;
    }

    case "status": {
      try {
        await getAccessToken();
        console.error(`Signed in. Connected to ${REMOTE_MCP_URL}`);
      } catch (error) {
        console.error(
          `Not signed in: ${error instanceof Error ? error.message : error}`,
        );
        process.exitCode = 1;
      }
      return;
    }

    case undefined: {
      // No arguments: this is an MCP client launching us over stdio. Sign in if
      // needed - the browser opens before the client's first request lands -
      // then relay everything to the hosted server.
      await runBridge();
      return;
    }

    default: {
      console.error(
        `Unknown command "${command}".\n\nUsage:\n  lynq-mcp          run as an MCP server (used by Claude, Codex, ...)\n  lynq-mcp login    sign in to Lynq\n  lynq-mcp logout   forget the saved sign-in\n  lynq-mcp status   check the current sign-in`,
      );
      process.exitCode = 1;
    }
  }
}

main().catch((error) => {
  console.error("Lynq MCP failed:", error);
  process.exit(1);
});
