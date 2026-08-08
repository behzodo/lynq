import { ConvexError, v } from "convex/values";
import { action, mutation, query, QueryCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import { deleteWebhook, getMe, setWebhook } from "../lib/telegram";

async function requireOrgId(ctx: QueryCtx) {
  const identity = (await ctx.auth.getUserIdentity()) as {
    orgId?: string;
  } | null;

  if (identity === null) {
    throw new ConvexError({
      code: "UNAUTHORIZED",
      message: "Identity not found",
    });
  }

  if (!identity.orgId) {
    throw new ConvexError({
      code: "UNAUTHORIZED",
      message: "Organization not found",
    });
  }

  return identity.orgId;
}

/**
 * Dashboard view of the integration. Deliberately omits botToken and
 * webhookSecret so the bot credentials never reach the browser.
 */
export const getOne = query({
  args: {},
  handler: async (ctx) => {
    const orgId = await requireOrgId(ctx);

    const integration = await ctx.db
      .query("telegramIntegrations")
      .withIndex("by_organization_id", (q) => q.eq("organizationId", orgId))
      .unique();

    if (!integration) {
      return null;
    }

    return {
      _id: integration._id,
      botUsername: integration.botUsername,
      isActive: integration.isActive,
      connectedAt: integration._creationTime,
    };
  },
});

export const connect = action({
  args: {
    botToken: v.string(),
  },
  handler: async (ctx, args): Promise<{ botUsername: string }> => {
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

    const botToken = args.botToken.trim();

    // Step 1: prove the token is real and grab the bot's username
    const me = await getMe(botToken);

    if (!me.ok || !me.result) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message:
          me.description ?? "Invalid bot token. Check the token from @BotFather.",
      });
    }

    // Step 2: point the bot at our webhook. The secret both authenticates the
    // callback and identifies which organization it belongs to.
    const webhookSecret = crypto.randomUUID().replace(/-/g, "");
    const siteUrl = process.env.CONVEX_SITE_URL;

    if (!siteUrl) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Missing CONVEX_SITE_URL",
      });
    }

    const hook = await setWebhook(
      botToken,
      `${siteUrl}/telegram/webhook`,
      webhookSecret,
    );

    if (!hook.ok) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: hook.description ?? "Could not register the Telegram webhook",
      });
    }

    await ctx.runMutation(internal.system.telegram.upsertIntegration, {
      organizationId: orgId,
      botToken,
      botUsername: me.result.username,
      webhookSecret,
    });

    return { botUsername: me.result.username };
  },
});

export const disconnect = action({
  args: {},
  handler: async (ctx): Promise<null> => {
    const identity = (await ctx.auth.getUserIdentity()) as {
      orgId?: string;
    } | null;

    if (identity === null || !identity.orgId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Organization not found",
      });
    }

    const integration = await ctx.runQuery(
      internal.system.telegram.getIntegrationByOrganizationId,
      { organizationId: identity.orgId },
    );

    if (integration) {
      // Best effort - the row goes away either way
      await deleteWebhook(integration.botToken);
    }

    await ctx.runMutation(internal.system.telegram.removeIntegration, {
      organizationId: identity.orgId,
    });

    return null;
  },
});

/**
 * Re-registers the webhook. Needed after the bot gains new update types
 * (button presses), which an older registration would not deliver.
 */
export const resync = action({
  args: {},
  handler: async (ctx): Promise<null> => {
    const identity = (await ctx.auth.getUserIdentity()) as {
      orgId?: string;
    } | null;

    if (identity === null || !identity.orgId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Organization not found",
      });
    }

    const integration = await ctx.runQuery(
      internal.system.telegram.getIntegrationByOrganizationId,
      { organizationId: identity.orgId },
    );

    if (!integration) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Telegram bot not connected",
      });
    }

    const siteUrl = process.env.CONVEX_SITE_URL;

    if (!siteUrl) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Missing CONVEX_SITE_URL",
      });
    }

    const hook = await setWebhook(
      integration.botToken,
      `${siteUrl}/telegram/webhook`,
      integration.webhookSecret,
    );

    if (!hook.ok) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: hook.description ?? "Could not refresh the Telegram webhook",
      });
    }

    return null;
  },
});

/** Full Telegram identity behind a conversation, for the operator panel. */
export const getProfileByConversationId = query({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const orgId = await requireOrgId(ctx);

    const conversation = await ctx.db.get(args.conversationId);

    if (!conversation || conversation.organizationId !== orgId) {
      return null;
    }

    const chat = await ctx.db
      .query("telegramChats")
      .withIndex("by_conversation_id", (q) =>
        q.eq("conversationId", conversation._id),
      )
      .unique();

    if (!chat) {
      return null;
    }

    return {
      chatId: chat.chatId,
      profile: chat.profile ?? {},
    };
  },
});

export const setActive = mutation({
  args: {
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const orgId = await requireOrgId(ctx);

    const integration = await ctx.db
      .query("telegramIntegrations")
      .withIndex("by_organization_id", (q) => q.eq("organizationId", orgId))
      .unique();

    if (!integration) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Telegram bot not connected",
      });
    }

    await ctx.db.patch(integration._id, { isActive: args.isActive });
  },
});
