import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { paginationOptsValidator } from "convex/server";
import { listMessages, saveCustomerMessage } from "../lib/threads";
import { SESSION_DURATION_MS } from "../constants";

const AUTO_REFRESH_THRESHOLD_MS = 4 * 60 * 60 * 1000;

/**
 * Lets a widget visitor upload an image straight to storage. Gated on a live
 * contact session so anonymous callers can't fill storage.
 */
export const generateUploadUrl = mutation({
  args: {
    contactSessionId: v.id("contactSessions"),
  },
  handler: async (ctx, args) => {
    const contactSession = await ctx.db.get(args.contactSessionId);

    if (!contactSession || contactSession.expiresAt < Date.now()) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Invalid session",
      });
    }

    return await ctx.storage.generateUploadUrl();
  },
});

export const create = mutation({
  args: {
    prompt: v.string(),
    threadId: v.string(),
    contactSessionId: v.id("contactSessions"),
    imageStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const contactSession = await ctx.db.get(args.contactSessionId);

    if (!contactSession || contactSession.expiresAt < Date.now()) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Invalid session",
      });
    }

    const conversation = await ctx.db
      .query("conversations")
      .withIndex("by_thread_id", (q) => q.eq("threadId", args.threadId))
      .unique();

    if (!conversation) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Conversation not found",
      });
    }

    if (conversation.status === "resolved") {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Conversation resolved",
      });
    }

    // Keep the visitor signed in while they are actively chatting
    if (
      contactSession.expiresAt - Date.now() <
      AUTO_REFRESH_THRESHOLD_MS
    ) {
      await ctx.db.patch(args.contactSessionId, {
        expiresAt: Date.now() + SESSION_DURATION_MS,
      });
    }

    // Attachments ride along as markdown so they stay plain text in the thread
    let prompt = args.prompt;

    if (args.imageStorageId) {
      const imageUrl = await ctx.storage.getUrl(args.imageStorageId);

      if (!imageUrl) {
        throw new ConvexError({
          code: "NOT_FOUND",
          message: "Uploaded image not found",
        });
      }

      prompt = [`![Attached image](${imageUrl})`, args.prompt.trim()]
        .filter(Boolean)
        .join("\n\n");
    }

    if (!prompt.trim()) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Message is empty",
      });
    }

    await saveCustomerMessage(ctx, {
      threadId: args.threadId,
      prompt,
    });
  },
});

export const getMany = query({
  args: {
    threadId: v.string(),
    paginationOpts: paginationOptsValidator,
    contactSessionId: v.id("contactSessions"),
  },
  handler: async (ctx, args) => {
    const contactSession = await ctx.db.get(args.contactSessionId);

    if (!contactSession || contactSession.expiresAt < Date.now()) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Invalid session",
      });
    }

    return await listMessages(ctx, {
      threadId: args.threadId,
      paginationOpts: args.paginationOpts,
    });
  },
});
