import { ConvexError } from "convex/values";

/**
 * These endpoints are reachable by anyone who knows the deployment URL, so the
 * organization id alone can never be the authorization - it is caller-supplied.
 *
 * The MCP route in the web app is the only trusted caller: it verifies the
 * Clerk OAuth token, confirms the user really belongs to the organization, and
 * only then calls in with this shared secret. Treat the secret as the boundary
 * between "already authenticated by the route" and the open internet.
 */
export function assertMcpSecret(secret: string) {
  const expected = process.env.MCP_BACKEND_SECRET;

  if (!expected) {
    throw new ConvexError({
      code: "MISCONFIGURED",
      message: "MCP_BACKEND_SECRET is not set on this deployment",
    });
  }

  if (secret !== expected) {
    throw new ConvexError({
      code: "UNAUTHORIZED",
      message: "Invalid MCP credentials",
    });
  }
}

/** Guards against one organization touching another's row. */
export function assertSameOrg(
  documentOrgId: string,
  orgId: string,
  label: string,
) {
  if (documentOrgId !== orgId) {
    throw new ConvexError({
      code: "UNAUTHORIZED",
      message: `${label} belongs to another organization`,
    });
  }
}
