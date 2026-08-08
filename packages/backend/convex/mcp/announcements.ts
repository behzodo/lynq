import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { assertMcpSecret, assertSameOrg } from "./lib";

const announcementFields = {
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

export const getMany = query({
  args: {
    secret: v.string(),
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    assertMcpSecret(args.secret);
    const orgId = args.organizationId;

    return await ctx.db
      .query("announcements")
      .withIndex("by_organization_id", (q) => q.eq("organizationId", orgId))
      .order("desc")
      .collect();
  },
});

export const create = mutation({
  args: {
    secret: v.string(),
    organizationId: v.string(),
    ...announcementFields,
  },
  handler: async (ctx, args) => {
    const { secret, organizationId, ...fields } = args;
    assertMcpSecret(secret);
    const orgId = organizationId;

    return await ctx.db.insert("announcements", {
      ...fields,
      organizationId: orgId,
    });
  },
});

export const update = mutation({
  args: {
    secret: v.string(),
    organizationId: v.string(),
    announcementId: v.id("announcements"),
    ...announcementFields,
  },
  handler: async (ctx, args) => {
    const { secret, organizationId, announcementId, ...fields } = args;
    assertMcpSecret(secret);
    const orgId = organizationId;

    const announcement = await ctx.db.get(announcementId);

    if (!announcement) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Announcement not found",
      });
    }

    assertSameOrg(announcement.organizationId, orgId, "Announcement");

    await ctx.db.patch(announcementId, fields);
  },
});

export const setActive = mutation({
  args: {
    secret: v.string(),
    organizationId: v.string(),
    announcementId: v.id("announcements"),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    assertMcpSecret(args.secret);
    const orgId = args.organizationId;

    const announcement = await ctx.db.get(args.announcementId);

    if (!announcement) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Announcement not found",
      });
    }

    assertSameOrg(announcement.organizationId, orgId, "Announcement");

    await ctx.db.patch(args.announcementId, { isActive: args.isActive });
  },
});

export const remove = mutation({
  args: {
    secret: v.string(),
    organizationId: v.string(),
    announcementId: v.id("announcements"),
  },
  handler: async (ctx, args) => {
    assertMcpSecret(args.secret);
    const orgId = args.organizationId;

    const announcement = await ctx.db.get(args.announcementId);

    if (!announcement) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Announcement not found",
      });
    }

    assertSameOrg(announcement.organizationId, orgId, "Announcement");

    await ctx.db.delete(args.announcementId);
  },
});
