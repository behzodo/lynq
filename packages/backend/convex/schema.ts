import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  widgetSettings: defineTable({
    organizationId: v.string(),
    greetMessage: v.string(),
    defaultSuggestions: v.object({
      suggestion1: v.optional(v.string()),
      suggestion2: v.optional(v.string()),
      suggestion3: v.optional(v.string()),
    }),
    // Brand logo shown on the launcher bubble and widget header
    logoStorageId: v.optional(v.id("_storage")),
  })
  .index("by_organization_id", ["organizationId"]),
  announcements: defineTable({
    organizationId: v.string(),
    type: v.union(v.literal("banner"), v.literal("popup")),
    title: v.string(),
    message: v.string(),
    ctaLabel: v.optional(v.string()),
    ctaUrl: v.optional(v.string()),
    bgColor: v.string(),
    textColor: v.string(),
    // Banners only - popups are always centered
    position: v.union(v.literal("top"), v.literal("bottom")),
    dismissible: v.boolean(),
    isActive: v.boolean(),
  })
    .index("by_organization_id", ["organizationId"])
    .index("by_organization_id_and_is_active", ["organizationId", "isActive"]),
  surveys: defineTable({
    organizationId: v.string(),
    title: v.string(),
    question: v.string(),
    // rating = 1-5 stars, nps = 0-10 scale, text = free text only
    type: v.union(v.literal("rating"), v.literal("nps"), v.literal("text")),
    commentLabel: v.optional(v.string()),
    thankYouMessage: v.string(),
    bgColor: v.string(),
    textColor: v.string(),
    position: v.union(
      v.literal("bottom-right"),
      v.literal("bottom-left"),
      v.literal("center"),
    ),
    delaySeconds: v.number(),
    isActive: v.boolean(),
  })
    .index("by_organization_id", ["organizationId"])
    .index("by_organization_id_and_is_active", ["organizationId", "isActive"]),
  surveyResponses: defineTable({
    surveyId: v.id("surveys"),
    organizationId: v.string(),
    // Absent for text-only surveys
    score: v.optional(v.number()),
    comment: v.optional(v.string()),
    metadata: v.optional(
      v.object({
        url: v.optional(v.string()),
        userAgent: v.optional(v.string()),
      }),
    ),
  })
    .index("by_survey_id", ["surveyId"])
    .index("by_organization_id", ["organizationId"]),
  tickets: defineTable({
    organizationId: v.string(),
    // Human-readable, sequential per organization (#1, #2, ...)
    number: v.number(),
    name: v.string(),
    surname: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    subject: v.string(),
    description: v.string(),
    category: v.union(
      v.literal("question"),
      v.literal("bug"),
      v.literal("billing"),
      v.literal("feature"),
      v.literal("other"),
    ),
    priority: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("urgent"),
    ),
    status: v.union(
      v.literal("open"),
      v.literal("in_progress"),
      v.literal("waiting"),
      v.literal("resolved"),
      v.literal("closed"),
    ),
    assigneeId: v.optional(v.string()),
    assigneeName: v.optional(v.string()),
    // Ties the ticket back to the widget visitor who opened it
    contactSessionId: v.id("contactSessions"),
    lastMessageAt: v.number(),
  })
    .index("by_organization_id", ["organizationId"])
    .index("by_organization_id_and_status", ["organizationId", "status"])
    .index("by_organization_id_and_number", ["organizationId", "number"])
    .index("by_contact_session_id", ["contactSessionId"]),
  ticketMessages: defineTable({
    ticketId: v.id("tickets"),
    organizationId: v.string(),
    authorType: v.union(v.literal("customer"), v.literal("agent")),
    authorName: v.string(),
    body: v.string(),
  })
    .index("by_ticket_id", ["ticketId"]),
  telegramIntegrations: defineTable({
    organizationId: v.string(),
    // Bot credentials from @BotFather. Never returned by any public or
    // dashboard-facing query - only internal functions read this field.
    botToken: v.string(),
    botUsername: v.string(),
    // Sent by Telegram in X-Telegram-Bot-Api-Secret-Token, proves the webhook
    // call really came from Telegram and tells us which org it belongs to.
    webhookSecret: v.string(),
    isActive: v.boolean(),
  })
    .index("by_organization_id", ["organizationId"])
    .index("by_webhook_secret", ["webhookSecret"]),
  telegramChats: defineTable({
    organizationId: v.string(),
    // Telegram chat id, stored as a string to avoid float precision issues
    chatId: v.string(),
    contactSessionId: v.id("contactSessions"),
    conversationId: v.id("conversations"),
    // Telegram has no screens, so the chat itself is the state machine.
    // "onboarding" collects identity once, then the user moves between
    // messaging support, the ticket wizard, and an open ticket.
    mode: v.optional(
      v.union(
        v.literal("onboarding"),
        v.literal("chat"),
        v.literal("ticket_form"),
        v.literal("ticket_reply"),
      ),
    ),
    onboardingStep: v.optional(v.string()),
    // Everything Telegram tells us about the person, plus what they give us
    profile: v.optional(
      v.object({
        telegramUserId: v.optional(v.string()),
        username: v.optional(v.string()),
        firstName: v.optional(v.string()),
        lastName: v.optional(v.string()),
        languageCode: v.optional(v.string()),
        phone: v.optional(v.string()),
        email: v.optional(v.string()),
      }),
    ),
    activeTicketId: v.optional(v.id("tickets")),
    ticketDraft: v.optional(
      v.object({
        step: v.string(),
        category: v.optional(v.string()),
        subject: v.optional(v.string()),
        description: v.optional(v.string()),
        imageUrl: v.optional(v.string()),
      }),
    ),
  })
    .index("by_organization_id_and_chat_id", ["organizationId", "chatId"])
    .index("by_conversation_id", ["conversationId"])
    .index("by_contact_session_id", ["contactSessionId"]),
  conversations: defineTable({
    threadId: v.string(),
    organizationId: v.string(),
    contactSessionId: v.id("contactSessions"),
    status: v.union(
      v.literal("unresolved"),
      v.literal("escalated"),
      v.literal("resolved")
    ),
  })
    .index("by_organization_id", ["organizationId"])
    .index("by_contact_session_id", ["contactSessionId"])
    .index("by_thread_id", ["threadId"])
    .index("by_status_and_organization_id", ["status", "organizationId"]),
  contactSessions: defineTable({
    name: v.string(),
    email: v.string(),
    organizationId: v.string(),
    expiresAt: v.number(),
    metadata: v.optional(v.object({
      userAgent: v.optional(v.string()),
      language: v.optional(v.string()),
      languages: v.optional(v.string()),
      platform: v.optional(v.string()),
      vendor: v.optional(v.string()),
      screenResolution: v.optional(v.string()),
      viewportSize: v.optional(v.string()),
      timezone: v.optional(v.string()),
      timezoneOffset: v.optional(v.number()),
      cookieEnabled: v.optional(v.boolean()),
      referrer: v.optional(v.string()),
      currentUrl: v.optional(v.string()),
    }))
  })
  .index("by_organization_id", ["organizationId"])
  .index("by_expires_at", ["expiresAt"]),
  users: defineTable({
    name: v.string(),
  }),
});
