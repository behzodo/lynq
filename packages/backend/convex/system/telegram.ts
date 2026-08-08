import { v } from "convex/values";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "../_generated/server";
import { internal } from "../_generated/api";
import {
  createThread,
  saveCustomerMessage as saveThreadCustomerMessage,
} from "../lib/threads";
import { sendMessage } from "../lib/telegram";
import { SESSION_DURATION_MS } from "../constants";

export const getIntegrationByWebhookSecret = internalQuery({
  args: {
    webhookSecret: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("telegramIntegrations")
      .withIndex("by_webhook_secret", (q) =>
        q.eq("webhookSecret", args.webhookSecret),
      )
      .unique();
  },
});

export const getIntegrationByOrganizationId = internalQuery({
  args: {
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("telegramIntegrations")
      .withIndex("by_organization_id", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .unique();
  },
});

export const upsertIntegration = internalMutation({
  args: {
    organizationId: v.string(),
    botToken: v.string(),
    botUsername: v.string(),
    webhookSecret: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("telegramIntegrations")
      .withIndex("by_organization_id", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        botToken: args.botToken,
        botUsername: args.botUsername,
        webhookSecret: args.webhookSecret,
        isActive: true,
      });

      return existing._id;
    }

    return await ctx.db.insert("telegramIntegrations", {
      organizationId: args.organizationId,
      botToken: args.botToken,
      botUsername: args.botUsername,
      webhookSecret: args.webhookSecret,
      isActive: true,
    });
  },
});

export const removeIntegration = internalMutation({
  args: {
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("telegramIntegrations")
      .withIndex("by_organization_id", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});

/**
 * Maps a Telegram chat onto the same contactSession + conversation model the
 * web widget uses, creating them on first contact.
 */
export const ensureChat = internalMutation({
  args: {
    organizationId: v.string(),
    chatId: v.string(),
    displayName: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("telegramChats")
      .withIndex("by_organization_id_and_chat_id", (q) =>
        q.eq("organizationId", args.organizationId).eq("chatId", args.chatId),
      )
      .unique();

    if (existing) {
      const conversation = await ctx.db.get(existing.conversationId);

      if (conversation) {
        // Telegram users never "log in", so keep their session alive
        await ctx.db.patch(existing.contactSessionId, {
          expiresAt: Date.now() + SESSION_DURATION_MS,
        });

        return {
          conversationId: conversation._id,
          threadId: conversation.threadId,
          status: conversation.status,
          isNew: false,
        };
      }

      // Conversation was deleted underneath us - start a fresh one
      await ctx.db.delete(existing._id);
    }

    const contactSessionId = await ctx.db.insert("contactSessions", {
      name: args.displayName,
      // Telegram gives us no email; this keeps the field meaningful and unique
      email: `telegram+${args.chatId}@telegram.local`,
      organizationId: args.organizationId,
      expiresAt: Date.now() + SESSION_DURATION_MS,
      metadata: {
        platform: "Telegram",
      },
    });

    const threadId = await createThread(ctx, {
      userId: args.organizationId,
    });

    const conversationId = await ctx.db.insert("conversations", {
      contactSessionId,
      status: "unresolved",
      organizationId: args.organizationId,
      threadId,
    });

    await ctx.db.insert("telegramChats", {
      organizationId: args.organizationId,
      chatId: args.chatId,
      contactSessionId,
      conversationId,
      // New chats must complete onboarding before anything else
      mode: "onboarding",
      onboardingStep: "contact",
    });

    return { conversationId, threadId, status: "unresolved", isNew: true };
  },
});

export const saveCustomerMessage = internalMutation({
  args: {
    threadId: v.string(),
    prompt: v.string(),
  },
  handler: async (ctx, args) => {
    await saveThreadCustomerMessage(ctx, {
      threadId: args.threadId,
      prompt: args.prompt,
    });
  },
});

const chatModeValidator = v.union(
  v.literal("onboarding"),
  v.literal("chat"),
  v.literal("ticket_form"),
  v.literal("ticket_reply"),
);

const ticketDraftValidator = v.object({
  step: v.string(),
  category: v.optional(v.string()),
  subject: v.optional(v.string()),
  description: v.optional(v.string()),
  imageUrl: v.optional(v.string()),
});

const profileValidator = v.object({
  telegramUserId: v.optional(v.string()),
  username: v.optional(v.string()),
  firstName: v.optional(v.string()),
  lastName: v.optional(v.string()),
  languageCode: v.optional(v.string()),
  phone: v.optional(v.string()),
  email: v.optional(v.string()),
});

export const getChatState = internalQuery({
  args: {
    organizationId: v.string(),
    chatId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("telegramChats")
      .withIndex("by_organization_id_and_chat_id", (q) =>
        q.eq("organizationId", args.organizationId).eq("chatId", args.chatId),
      )
      .unique();
  },
});

export const setChatState = internalMutation({
  args: {
    organizationId: v.string(),
    chatId: v.string(),
    mode: chatModeValidator,
    onboardingStep: v.optional(v.string()),
    ticketDraft: v.optional(ticketDraftValidator),
    activeTicketId: v.optional(v.id("tickets")),
  },
  handler: async (ctx, args) => {
    const chat = await ctx.db
      .query("telegramChats")
      .withIndex("by_organization_id_and_chat_id", (q) =>
        q.eq("organizationId", args.organizationId).eq("chatId", args.chatId),
      )
      .unique();

    if (!chat) {
      return;
    }

    await ctx.db.patch(chat._id, {
      mode: args.mode,
      onboardingStep: args.onboardingStep,
      ticketDraft: args.ticketDraft,
      activeTicketId: args.activeTicketId,
    });
  },
});

/**
 * Merges freshly learned identity details into the chat profile, and keeps the
 * contact session (what operators see in the dashboard) in sync.
 */
export const updateProfile = internalMutation({
  args: {
    organizationId: v.string(),
    chatId: v.string(),
    profile: profileValidator,
  },
  handler: async (ctx, args) => {
    const chat = await ctx.db
      .query("telegramChats")
      .withIndex("by_organization_id_and_chat_id", (q) =>
        q.eq("organizationId", args.organizationId).eq("chatId", args.chatId),
      )
      .unique();

    if (!chat) {
      return;
    }

    const profile = { ...(chat.profile ?? {}), ...args.profile };

    await ctx.db.patch(chat._id, { profile });

    const fullName =
      [profile.firstName, profile.lastName].filter(Boolean).join(" ") || undefined;

    const session = await ctx.db.get(chat.contactSessionId);

    if (session) {
      await ctx.db.patch(chat.contactSessionId, {
        ...(fullName ? { name: fullName } : {}),
        // Only overwrite the placeholder once we have a real address
        ...(profile.email ? { email: profile.email } : {}),
        metadata: {
          ...(session.metadata ?? {}),
          platform: "Telegram",
          language: profile.languageCode,
        },
      });
    }
  },
});

export const createTicket = internalMutation({
  args: {
    organizationId: v.string(),
    contactSessionId: v.id("contactSessions"),
    chatId: v.string(),
    category: v.union(
      v.literal("question"),
      v.literal("bug"),
      v.literal("billing"),
      v.literal("feature"),
      v.literal("other"),
    ),
    subject: v.string(),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    // Identity comes from onboarding, never re-asked per ticket
    const chat = await ctx.db
      .query("telegramChats")
      .withIndex("by_organization_id_and_chat_id", (q) =>
        q.eq("organizationId", args.organizationId).eq("chatId", args.chatId),
      )
      .unique();

    const profile = chat?.profile ?? {};
    const session = await ctx.db.get(args.contactSessionId);

    const latest = await ctx.db
      .query("tickets")
      .withIndex("by_organization_id_and_number", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .order("desc")
      .first();

    const number = (latest?.number ?? 0) + 1;

    const ticketId = await ctx.db.insert("tickets", {
      organizationId: args.organizationId,
      number,
      name: profile.firstName ?? session?.name ?? "Telegram",
      surname: profile.lastName ?? "user",
      email: profile.email ?? session?.email ?? "",
      phone: profile.phone,
      subject: args.subject,
      description: args.description,
      category: args.category,
      priority: "medium",
      status: "open",
      contactSessionId: args.contactSessionId,
      lastMessageAt: Date.now(),
    });

    await ctx.db.insert("ticketMessages", {
      ticketId,
      organizationId: args.organizationId,
      authorType: "customer",
      authorName:
        [profile.firstName, profile.lastName].filter(Boolean).join(" ") ||
        session?.name ||
        "Telegram user",
      body: args.description,
    });

    return { ticketId, number };
  },
});

/** Customer-side "my issue is handled" button. */
export const resolveTicket = internalMutation({
  args: {
    ticketId: v.id("tickets"),
    contactSessionId: v.id("contactSessions"),
  },
  handler: async (ctx, args) => {
    const ticket = await ctx.db.get(args.ticketId);

    if (!ticket || ticket.contactSessionId !== args.contactSessionId) {
      return null;
    }

    await ctx.db.patch(ticket._id, { status: "resolved" });

    await ctx.db.insert("ticketMessages", {
      ticketId: ticket._id,
      organizationId: ticket.organizationId,
      authorType: "customer",
      authorName: `${ticket.name} ${ticket.surname}`.trim(),
      body: "✅ Marked as done by the customer.",
    });

    return { number: ticket.number };
  },
});

/** Customer-side "done" for a plain support chat. */
export const resolveConversation = internalMutation({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);

    if (!conversation) {
      return;
    }

    await ctx.db.patch(conversation._id, { status: "resolved" });
  },
});

export const reopenConversation = internalMutation({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);

    if (!conversation || conversation.status !== "resolved") {
      return;
    }

    await ctx.db.patch(conversation._id, { status: "unresolved" });
  },
});

export const listTickets = internalQuery({
  args: {
    contactSessionId: v.id("contactSessions"),
  },
  handler: async (ctx, args) => {
    const tickets = await ctx.db
      .query("tickets")
      .withIndex("by_contact_session_id", (q) =>
        q.eq("contactSessionId", args.contactSessionId),
      )
      .order("desc")
      .take(20);

    return tickets.map((ticket) => ({
      _id: ticket._id,
      number: ticket.number,
      subject: ticket.subject,
      status: ticket.status,
    }));
  },
});

/** Looks a ticket up by its human-facing number, scoped to this chat's owner. */
export const getTicketByNumber = internalQuery({
  args: {
    organizationId: v.string(),
    contactSessionId: v.id("contactSessions"),
    number: v.number(),
  },
  handler: async (ctx, args) => {
    const ticket = await ctx.db
      .query("tickets")
      .withIndex("by_organization_id_and_number", (q) =>
        q.eq("organizationId", args.organizationId).eq("number", args.number),
      )
      .unique();

    if (!ticket || ticket.contactSessionId !== args.contactSessionId) {
      return null;
    }

    const messages = await ctx.db
      .query("ticketMessages")
      .withIndex("by_ticket_id", (q) => q.eq("ticketId", ticket._id))
      .collect();

    return {
      _id: ticket._id,
      number: ticket.number,
      subject: ticket.subject,
      status: ticket.status,
      messages: messages.slice(-6).map((message) => ({
        authorType: message.authorType,
        authorName: message.authorName,
        body: message.body,
      })),
    };
  },
});

export const addTicketMessage = internalMutation({
  args: {
    ticketId: v.id("tickets"),
    contactSessionId: v.id("contactSessions"),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const ticket = await ctx.db.get(args.ticketId);

    if (!ticket || ticket.contactSessionId !== args.contactSessionId) {
      return { ok: false as const, reason: "not_found" as const };
    }

    if (ticket.status === "closed") {
      return { ok: false as const, reason: "closed" as const };
    }

    await ctx.db.insert("ticketMessages", {
      ticketId: ticket._id,
      organizationId: ticket.organizationId,
      authorType: "customer",
      authorName: `${ticket.name} ${ticket.surname}`.trim(),
      body: args.body,
    });

    await ctx.db.patch(ticket._id, {
      lastMessageAt: Date.now(),
      status:
        ticket.status === "waiting" || ticket.status === "resolved"
          ? "open"
          : ticket.status,
    });

    return { ok: true as const, number: ticket.number };
  },
});

export const getChatByContactSessionId = internalQuery({
  args: {
    contactSessionId: v.id("contactSessions"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("telegramChats")
      .withIndex("by_contact_session_id", (q) =>
        q.eq("contactSessionId", args.contactSessionId),
      )
      .unique();
  },
});

export const getTicketContact = internalQuery({
  args: {
    ticketId: v.id("tickets"),
  },
  handler: async (ctx, args) => {
    const ticket = await ctx.db.get(args.ticketId);

    if (!ticket) {
      return null;
    }

    return {
      contactSessionId: ticket.contactSessionId,
      organizationId: ticket.organizationId,
      number: ticket.number,
    };
  },
});

/**
 * Pushes an operator's ticket reply or status change out to Telegram, when the
 * ticket belongs to a Telegram user.
 */
export const deliverTicketUpdate = internalAction({
  args: {
    ticketId: v.id("tickets"),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const ticket = await ctx.runQuery(
      internal.system.telegram.getTicketContact,
      { ticketId: args.ticketId },
    );

    if (!ticket) {
      return;
    }

    const chat = await ctx.runQuery(
      internal.system.telegram.getChatByContactSessionId,
      { contactSessionId: ticket.contactSessionId },
    );

    if (!chat) {
      // Ticket came from the web widget - nothing to push
      return;
    }

    const integration = await ctx.runQuery(
      internal.system.telegram.getIntegrationByOrganizationId,
      { organizationId: ticket.organizationId },
    );

    if (!integration || !integration.isActive) {
      return;
    }

    const result = await sendMessage(
      integration.botToken,
      chat.chatId,
      args.text,
    );

    if (!result.ok) {
      console.error("Telegram ticket update failed", result.description);
    }
  },
});

export const getChatByConversationId = internalQuery({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("telegramChats")
      .withIndex("by_conversation_id", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .unique();
  },
});

/**
 * Pushes an operator's dashboard reply out to Telegram. Scheduled from the
 * message mutation, so a Telegram outage can never fail the reply itself.
 */
export const deliverOperatorMessage = internalAction({
  args: {
    conversationId: v.id("conversations"),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const chat = await ctx.runQuery(
      internal.system.telegram.getChatByConversationId,
      { conversationId: args.conversationId },
    );

    if (!chat) {
      // Not a Telegram conversation - nothing to do
      return;
    }

    const integration = await ctx.runQuery(
      internal.system.telegram.getIntegrationByOrganizationId,
      { organizationId: chat.organizationId },
    );

    if (!integration || !integration.isActive) {
      return;
    }

    const result = await sendMessage(
      integration.botToken,
      chat.chatId,
      args.text,
    );

    if (!result.ok) {
      console.error("Telegram sendMessage failed", result.description);
    }
  },
});
