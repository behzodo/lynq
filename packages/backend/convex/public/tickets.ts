import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { QueryCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

const MAX_SUBJECT_LENGTH = 200;
const MAX_BODY_LENGTH = 5000;

/**
 * Widget callers authenticate with a contact session id instead of Clerk.
 * Every handler re-validates it, exactly like conversations do.
 */
async function requireSession(
  ctx: QueryCtx,
  contactSessionId: Id<"contactSessions">,
) {
  const session = await ctx.db.get(contactSessionId);

  if (!session || session.expiresAt < Date.now()) {
    throw new ConvexError({
      code: "UNAUTHORIZED",
      message: "Invalid session",
    });
  }

  return session;
}

async function requireOwnedTicket(
  ctx: QueryCtx,
  ticketId: Id<"tickets">,
  contactSessionId: Id<"contactSessions">,
) {
  const session = await requireSession(ctx, contactSessionId);
  const ticket = await ctx.db.get(ticketId);

  if (!ticket) {
    throw new ConvexError({ code: "NOT_FOUND", message: "Ticket not found" });
  }

  if (ticket.contactSessionId !== session._id) {
    throw new ConvexError({
      code: "UNAUTHORIZED",
      message: "Incorrect session",
    });
  }

  return ticket;
}

export const create = mutation({
  args: {
    organizationId: v.string(),
    contactSessionId: v.id("contactSessions"),
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
  },
  handler: async (ctx, args) => {
    const session = await requireSession(ctx, args.contactSessionId);

    if (session.organizationId !== args.organizationId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Invalid organization",
      });
    }

    // Sequential per-org number. Convex mutations are serializable, so the
    // read-then-write here can't hand out the same number twice.
    const latest = await ctx.db
      .query("tickets")
      .withIndex("by_organization_id_and_number", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .order("desc")
      .first();

    const number = (latest?.number ?? 0) + 1;
    const now = Date.now();

    const ticketId = await ctx.db.insert("tickets", {
      organizationId: args.organizationId,
      number,
      name: args.name,
      surname: args.surname,
      email: args.email,
      phone: args.phone,
      subject: args.subject.slice(0, MAX_SUBJECT_LENGTH),
      description: args.description.slice(0, MAX_BODY_LENGTH),
      category: args.category,
      priority: "medium",
      status: "open",
      contactSessionId: session._id,
      lastMessageAt: now,
    });

    // The description doubles as the first message in the thread
    await ctx.db.insert("ticketMessages", {
      ticketId,
      organizationId: args.organizationId,
      authorType: "customer",
      authorName: `${args.name} ${args.surname}`.trim(),
      body: args.description.slice(0, MAX_BODY_LENGTH),
    });

    return { ticketId, number };
  },
});

export const getMany = query({
  args: {
    contactSessionId: v.id("contactSessions"),
  },
  handler: async (ctx, args) => {
    const session = await requireSession(ctx, args.contactSessionId);

    const tickets = await ctx.db
      .query("tickets")
      .withIndex("by_contact_session_id", (q) =>
        q.eq("contactSessionId", session._id),
      )
      .order("desc")
      .collect();

    return tickets.map((ticket) => ({
      _id: ticket._id,
      number: ticket.number,
      subject: ticket.subject,
      status: ticket.status,
      category: ticket.category,
      lastMessageAt: ticket.lastMessageAt,
    }));
  },
});

export const getOne = query({
  args: {
    ticketId: v.id("tickets"),
    contactSessionId: v.id("contactSessions"),
  },
  handler: async (ctx, args) => {
    const ticket = await requireOwnedTicket(
      ctx,
      args.ticketId,
      args.contactSessionId,
    );

    const messages = await ctx.db
      .query("ticketMessages")
      .withIndex("by_ticket_id", (q) => q.eq("ticketId", ticket._id))
      .collect();

    return {
      _id: ticket._id,
      number: ticket.number,
      subject: ticket.subject,
      status: ticket.status,
      priority: ticket.priority,
      category: ticket.category,
      messages: messages.map((message) => ({
        _id: message._id,
        _creationTime: message._creationTime,
        authorType: message.authorType,
        authorName: message.authorName,
        body: message.body,
      })),
    };
  },
});

export const addMessage = mutation({
  args: {
    ticketId: v.id("tickets"),
    contactSessionId: v.id("contactSessions"),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const ticket = await requireOwnedTicket(
      ctx,
      args.ticketId,
      args.contactSessionId,
    );

    if (ticket.status === "closed") {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Ticket is closed",
      });
    }

    await ctx.db.insert("ticketMessages", {
      ticketId: ticket._id,
      organizationId: ticket.organizationId,
      authorType: "customer",
      authorName: `${ticket.name} ${ticket.surname}`.trim(),
      body: args.body.slice(0, MAX_BODY_LENGTH),
    });

    // A customer reply pulls a waiting/resolved ticket back into the queue
    await ctx.db.patch(ticket._id, {
      lastMessageAt: Date.now(),
      status:
        ticket.status === "waiting" || ticket.status === "resolved"
          ? "open"
          : ticket.status,
    });
  },
});
