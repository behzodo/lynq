import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";

async function requireOrgId(ctx: {
  auth: { getUserIdentity: () => Promise<unknown> };
}) {
  const identity = (await ctx.auth.getUserIdentity()) as {
    orgId?: string;
  } | null;

  if (identity === null) {
    throw new ConvexError({
      code: "UNAUTHORIZED",
      message: "Identity not found",
    });
  }

  const orgId = identity.orgId;

  if (!orgId) {
    throw new ConvexError({
      code: "UNAUTHORIZED",
      message: "Organization not found",
    });
  }

  return orgId;
}

/**
 * Keys are only ever generated server-side. `crypto.randomUUID` is available in
 * the Convex runtime and gives 122 bits of entropy per segment.
 */
function generateKey() {
  const body = `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, "");
  return `lynq_${body}`;
}

export const getMany = query({
  args: {},
  handler: async (ctx) => {
    const orgId = await requireOrgId(ctx);

    const apiKeys = await ctx.db
      .query("apiKeys")
      .withIndex("by_organization_id", (q) => q.eq("organizationId", orgId))
      .order("desc")
      .collect();

    // Never return the key itself - it is shown once, at creation
    return apiKeys.map(({ key: _key, ...rest }) => rest);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const orgId = await requireOrgId(ctx);

    const key = generateKey();

    await ctx.db.insert("apiKeys", {
      organizationId: orgId,
      name: args.name,
      key,
      preview: `${key.slice(0, 12)}…${key.slice(-4)}`,
    });

    // The only time the full key leaves the database
    return key;
  },
});

export const remove = mutation({
  args: {
    apiKeyId: v.id("apiKeys"),
  },
  handler: async (ctx, args) => {
    const orgId = await requireOrgId(ctx);

    const apiKey = await ctx.db.get(args.apiKeyId);

    if (!apiKey) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "API key not found",
      });
    }

    if (apiKey.organizationId !== orgId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Invalid Organization ID",
      });
    }

    await ctx.db.delete(args.apiKeyId);
  },
});
