import { v } from "convex/values";
import { query } from "../_generated/server";

/**
 * Read-only feed consumed by the embed script on customer websites.
 * No session is required - only published announcements are ever returned,
 * and only the fields needed to render them.
 */
export const getActive = query({
  args: {
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    const announcements = await ctx.db
      .query("announcements")
      .withIndex("by_organization_id_and_is_active", (q) =>
        q.eq("organizationId", args.organizationId).eq("isActive", true),
      )
      .collect();

    return announcements.map((announcement) => ({
      id: announcement._id,
      type: announcement.type,
      title: announcement.title,
      message: announcement.message,
      ctaLabel: announcement.ctaLabel ?? "",
      ctaUrl: announcement.ctaUrl ?? "",
      bgColor: announcement.bgColor,
      textColor: announcement.textColor,
      position: announcement.position,
      dismissible: announcement.dismissible,
    }));
  },
});
