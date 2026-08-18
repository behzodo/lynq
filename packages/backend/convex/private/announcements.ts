import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { assertDepartmentInOrg } from "./departments";

const announcementFields = {
  // Absent means every department - see the schema comment
  departmentId: v.optional(v.id("departments")),
  // Absent means every surface - see the schema comment
  platforms: v.optional(
    v.array(v.union(v.literal("web"), v.literal("ios"), v.literal("android"))),
  ),
  type: v.union(v.literal("banner"), v.literal("popup")),
  title: v.string(),
  message: v.string(),
  ctaLabel: v.optional(v.string()),
  ctaUrl: v.optional(v.string()),
  bgColor: v.string(),
  textColor: v.string(),
  position: v.union(v.literal("top"), v.literal("bottom")),
  dismissible: v.boolean(),
  isActive: v.boolean(),
};

/**
 * Every handler below re-checks that the announcement belongs to the caller's
 * organization - the org id only ever comes from the verified Clerk identity.
 */
/**
 * The org id if the caller has one, otherwise null. Reads use this so they can
 * return an empty list during the window where Convex auth has not caught up
 * with Clerk yet - a component mounting mid org switch is not an error.
 */
async function getOrgId(ctx: { auth: { getUserIdentity: () => Promise<unknown> } }) {
  const identity = (await ctx.auth.getUserIdentity()) as {
    orgId?: string;
  } | null;

  return identity?.orgId ?? null;
}

async function requireOrgId(ctx: { auth: { getUserIdentity: () => Promise<unknown> } }) {
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

export const getMany = query({
  args: {},
  handler: async (ctx) => {
    const orgId = await getOrgId(ctx);

    if (orgId === null) {
      return [];
    }

    return await ctx.db
      .query("announcements")
      .withIndex("by_organization_id", (q) => q.eq("organizationId", orgId))
      .order("desc")
      .collect();
  },
});

export const create = mutation({
  args: announcementFields,
  handler: async (ctx, args) => {
    const orgId = await requireOrgId(ctx);
    await assertDepartmentInOrg(ctx, args.departmentId, orgId);

    return await ctx.db.insert("announcements", {
      ...args,
      organizationId: orgId,
    });
  },
});

export const update = mutation({
  args: {
    announcementId: v.id("announcements"),
    ...announcementFields,
  },
  handler: async (ctx, args) => {
    const orgId = await requireOrgId(ctx);

    const { announcementId, ...fields } = args;

    const announcement = await ctx.db.get(announcementId);

    if (!announcement) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Announcement not found",
      });
    }

    if (announcement.organizationId !== orgId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Invalid Organization ID",
      });
    }

    await assertDepartmentInOrg(ctx, fields.departmentId, orgId);

    // A patch with departmentId: undefined clears the field, which is exactly
    // what moving an announcement back to "All departments" should do.
    await ctx.db.patch(announcementId, fields);
  },
});

export const setActive = mutation({
  args: {
    announcementId: v.id("announcements"),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const orgId = await requireOrgId(ctx);

    const announcement = await ctx.db.get(args.announcementId);

    if (!announcement) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Announcement not found",
      });
    }

    if (announcement.organizationId !== orgId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Invalid Organization ID",
      });
    }

    await ctx.db.patch(args.announcementId, { isActive: args.isActive });
  },
});

export const remove = mutation({
  args: {
    announcementId: v.id("announcements"),
  },
  handler: async (ctx, args) => {
    const orgId = await requireOrgId(ctx);

    const announcement = await ctx.db.get(args.announcementId);

    if (!announcement) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Announcement not found",
      });
    }

    if (announcement.organizationId !== orgId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Invalid Organization ID",
      });
    }

    await ctx.db.delete(args.announcementId);
  },
});
