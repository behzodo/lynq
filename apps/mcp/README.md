# @lynq/mcp

Connect Claude, Codex, or any MCP client to your [Lynq](https://lynq-web.vercel.app)
account. Ask the agent for a banner and it writes the copy, picks colours that
match your widget, and publishes it.

You sign in with your Lynq account in the browser. There is no API key to copy.

## Setup

Add it to your MCP client:

```bash
claude mcp add lynq -- npx -y @lynq/mcp
```

Or, for clients that use a config file:

```json
{
  "mcpServers": {
    "lynq": {
      "command": "npx",
      "args": ["-y", "@lynq/mcp"]
    }
  }
}
```

The first time it starts, a browser tab opens asking you to sign in to Lynq.
Approve it once and the sign-in is remembered — later runs go straight through.

To sign in ahead of time:

```bash
npx @lynq/mcp login
```

## Commands

| Command | What it does |
| --- | --- |
| `lynq-mcp` | Run as an MCP server. This is what your client launches. |
| `lynq-mcp login` | Sign in now, instead of on first use |
| `lynq-mcp logout` | Forget the saved sign-in |
| `lynq-mcp status` | Check whether you are signed in |

## Tools

| Tool | Purpose |
| --- | --- |
| `get_brand` | Widget settings and colours already in use. Call first. |
| `list_organizations` | Organizations you can manage |
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

If your account belongs to one organization it is used automatically. With
several, the agent must pass `organizationId` — `list_organizations` shows them.

## How it works

The command your client launches is a thin local bridge. It handles the OAuth
sign-in, then relays MCP traffic to the hosted server at `/mcp`, which verifies
the token with Clerk and checks your organization membership before touching
anything.

Sign-in uses OAuth 2.0 with PKCE against a public client, so no secret ships in
this package. The access and refresh tokens are stored in
`~/.lynq/credentials.json` with `0600` permissions. Delete that file, or run
`lynq-mcp logout`, to sign out.

## Environment

| Variable | Purpose | Default |
| --- | --- | --- |
| `LYNQ_MCP_URL` | Hosted MCP endpoint | `https://lynq-web.vercel.app/mcp` |
| `LYNQ_OAUTH_ISSUER` | Clerk instance | the Lynq instance |
| `LYNQ_OAUTH_CLIENT_ID` | OAuth client | the Lynq CLI client |

## Note on publishing

`create_announcement` and `create_survey` take `isActive`. Setting it `true`
publishes to every visitor on every site running your widget **immediately**,
with no confirmation. Ask for a draft (`isActive: false`) first if you want to
review before it goes out.
