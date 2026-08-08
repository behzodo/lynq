import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";

/**
 * Resolves the authenticated caller's organization, throwing if either the
 * identity or the organization is missing.
 */
const requireOrgId = async (ctx: {
  auth: { getUserIdentity: () => Promise<unknown> };
}) => {
  const identity = (await ctx.auth.getUserIdentity()) as {
    orgId?: unknown;
  } | null;

  if (identity === null) {
    throw new ConvexError({
      code: "UNAUTHORIZED",
      message: "Identity not found",
    });
  }

  const orgId = identity.orgId as string;

  if (!orgId) {
    throw new ConvexError({
      code: "UNAUTHORIZED",
      message: "Organization not found",
    });
  }

  return orgId;
};

// The browser uploads the logo straight to Convex storage using this short
// lived URL, so the file never passes through a mutation argument.
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireOrgId(ctx);

    return await ctx.storage.generateUploadUrl();
  },
});

export const upsert = mutation({
  args: {
    greetMessage: v.string(),
    defaultSuggestions: v.object({
      suggestion1: v.optional(v.string()),
      suggestion2: v.optional(v.string()),
      suggestion3: v.optional(v.string()),
    }),
    logoStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const orgId = await requireOrgId(ctx);

    const existingWidgetSettings = await ctx.db
      .query("widgetSettings")
      .withIndex("by_organization_id", (q) => q.eq("organizationId", orgId))
      .unique();

    if (existingWidgetSettings) {
      // Drop the previous file when the logo is replaced or cleared, otherwise
      // orphaned uploads accumulate in storage.
      const previousLogoId = existingWidgetSettings.logoStorageId;

      if (previousLogoId && previousLogoId !== args.logoStorageId) {
        await ctx.storage.delete(previousLogoId);
      }

      await ctx.db.patch(existingWidgetSettings._id, {
        greetMessage: args.greetMessage,
        defaultSuggestions: args.defaultSuggestions,
        logoStorageId: args.logoStorageId,
      });
    } else {
      await ctx.db.insert("widgetSettings", {
        organizationId: orgId,
        greetMessage: args.greetMessage,
        defaultSuggestions: args.defaultSuggestions,
        logoStorageId: args.logoStorageId,
      });
    }
  },
});

export const getOne = query({
  args: {},
  handler: async (ctx) => {
    const orgId = await requireOrgId(ctx);

    const widgetSettings = await ctx.db
      .query("widgetSettings")
      .withIndex("by_organization_id", (q) => q.eq("organizationId", orgId))
      .unique();

    if (!widgetSettings) {
      return null;
    }

    return {
      ...widgetSettings,
      logoUrl: widgetSettings.logoStorageId
        ? await ctx.storage.getUrl(widgetSettings.logoStorageId)
        : null,
    };
  },
});
