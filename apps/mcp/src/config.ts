import { homedir } from "node:os";
import { join } from "node:path";

/** Where the hosted MCP endpoint lives. Overridable for local development. */
export const REMOTE_MCP_URL =
  process.env.LYNQ_MCP_URL || "https://lynq-web.vercel.app/mcp";

/**
 * Public OAuth client registered in Clerk for this CLI. Public clients hold no
 * secret - PKCE is what proves the token request came from the same process
 * that started the flow - so shipping this id in the package is expected.
 */
export const OAUTH_CLIENT_ID =
  process.env.LYNQ_OAUTH_CLIENT_ID || "upyAKo2JpRPlsZCU";

export const OAUTH_ISSUER =
  process.env.LYNQ_OAUTH_ISSUER || "https://sure-garfish-42.clerk.accounts.dev";

export const AUTHORIZATION_ENDPOINT = `${OAUTH_ISSUER}/oauth/authorize`;
export const TOKEN_ENDPOINT = `${OAUTH_ISSUER}/oauth/token`;

/** offline_access is what gets us a refresh token, so login happens once. */
export const OAUTH_SCOPES = "openid profile email offline_access";

/** Must match the redirect URIs registered on the Clerk application. */
export const CALLBACK_PORTS = [8976, 8977, 8978];

export const CREDENTIALS_DIR = join(homedir(), ".lynq");
export const CREDENTIALS_PATH = join(CREDENTIALS_DIR, "credentials.json");
