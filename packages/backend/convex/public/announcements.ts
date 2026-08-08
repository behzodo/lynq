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
    /**
     * Which department's site is asking. Taken as a plain string, not an Id,
     * because this is reachable by anyone: a malformed value should quietly
     * match nothing rather than fail argument validation.
     */
    departmentId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const announcements = await ctx.db
      .query("announcements")
      .withIndex("by_organization_id_and_is_active", (q) =>
        q.eq("organizationId", args.organizationId).eq("isActive", true),
      )
      .collect();

    // Organization-wide announcements (no departmentId) show everywhere. A page
    // that doesn't name a department therefore sees only those, which is what
    // installs made before departments existed keep doing.
    const visible = announcements.filter(
      (announcement) =>
        announcement.departmentId === undefined ||
        announcement.departmentId === args.departmentId,
    );

    return visible.map((announcement) => ({
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
