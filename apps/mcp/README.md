# @lynq/mcp

MCP server for [Lynq](https://lynq-web.vercel.app). Connect it to Claude, Codex,
or any MCP client and the agent can write and publish your widget announcements
and surveys.

## Setup

1. In the Lynq dashboard open **Setup & Integrations → AI agents** and create an
   API key. It is shown once.
2. Add the server to your MCP client config:

```json
{
  "mcpServers": {
    "lynq": {
      "command": "npx",
      "args": ["-y", "@lynq/mcp"],
      "env": {
        "LYNQ_API_KEY": "lynq_..."
      }
    }
  }
}
```

Claude Desktop reads `claude_desktop_config.json`; Claude Code accepts the same
shape via `claude mcp add`.

3. Restart the client and ask for something:

> Create a banner announcing our Black Friday sale, 30% off, ending Monday.

## Tools

| Tool | Purpose |
| --- | --- |
| `get_brand` | Widget settings and colours already in use. Call first. |
| `list_announcements` | Every banner and popup |
| `create_announcement` | Create a banner or popup |
| `update_announcement` | Replace all fields of one |
| `publish_announcement` | Turn on or off |
| `delete_announcement` | Delete permanently |
| `list_surveys` | Every survey |
| `create_survey` | Create a rating, NPS, or text survey |
| `update_survey` | Replace all fields of one |
| `publish_survey` | Turn on or off |
| `delete_survey` | Delete permanently |
| `get_survey_results` | Response count, average score, comments |

## Environment

| Variable | Required | Default |
| --- | --- | --- |
| `LYNQ_API_KEY` | yes | — |
| `LYNQ_CONVEX_URL` | no | `https://basic-hound-309.convex.cloud` |

## Note on publishing

`create_announcement` and `create_survey` accept `isActive`. Setting it `true`
publishes to every visitor on every site running your widget **immediately**,
with no confirmation step. Ask the agent for a draft (`isActive: false`) first if
you want to review before it goes out.

## Development

```bash
pnpm install
pnpm --filter @lynq/mcp build
LYNQ_API_KEY=lynq_... node apps/mcp/build/index.js
```

The server speaks MCP over stdio, so it prints nothing useful when run directly —
logs go to stderr and the protocol owns stdout.
