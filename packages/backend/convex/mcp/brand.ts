import { v } from "convex/values";
import { query } from "../_generated/server";
import { orgIdFromApiKey } from "./lib";

/**
 * Gives the agent enough context to write on-brand copy and pick colours that
 * match the widget, instead of inventing them.
 */
export const get = query({
  args: {
    apiKey: v.string(),
  },
  handler: async (ctx, args) => {
    const orgId = await orgIdFromApiKey(ctx, args.apiKey);

    const widgetSettings = await ctx.db
      .query("widgetSettings")
      .withIndex("by_organization_id", (q) => q.eq("organizationId", orgId))
      .unique();

    const activeAnnouncements = await ctx.db
      .query("announcements")
      .withIndex("by_organization_id_and_is_active", (q) =>
        q.eq("organizationId", orgId).eq("isActive", true),
      )
      .collect();

    return {
      organizationId: orgId,
      greetMessage: widgetSettings?.greetMessage ?? null,
      defaultSuggestions: widgetSettings?.defaultSuggestions ?? null,
      hasLogo: Boolean(widgetSettings?.logoStorageId),
      // The widget chrome is this blue, so announcements that use it look native
      widgetPrimaryColor: "#3b82f6",
      activeAnnouncementCount: activeAnnouncements.length,
      // Colour pairs already in use, so the agent can stay consistent
      existingColorPairs: activeAnnouncements.map((announcement) => ({
        bgColor: announcement.bgColor,
        textColor: announcement.textColor,
      })),
    };
  },
});
