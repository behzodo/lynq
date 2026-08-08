import { ConvexError } from "convex/values";
import { MutationCtx, QueryCtx } from "../_generated/server";

/**
 * Resolves an API key to its organization. This is the only authentication the
 * MCP endpoints have - an AI agent has no Clerk session - so every handler in
 * this folder must start here and scope its work to the returned org.
 */
export async function orgIdFromApiKey(
  ctx: QueryCtx | MutationCtx,
  apiKey: string,
) {
  const record = await ctx.db
    .query("apiKeys")
    .withIndex("by_key", (q) => q.eq("key", apiKey))
    .unique();

  if (!record) {
    throw new ConvexError({
      code: "UNAUTHORIZED",
      message: "Invalid API key",
    });
  }

  return record.organizationId;
}

/**
 * Same as above, but also stamps last usage. Mutations only - queries cannot
 * write.
 */
export async function orgIdFromApiKeyAndTouch(ctx: MutationCtx, apiKey: string) {
  const record = await ctx.db
    .query("apiKeys")
    .withIndex("by_key", (q) => q.eq("key", apiKey))
    .unique();

  if (!record) {
    throw new ConvexError({
      code: "UNAUTHORIZED",
      message: "Invalid API key",
    });
  }

  await ctx.db.patch(record._id, { lastUsedAt: Date.now() });

  return record.organizationId;
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
