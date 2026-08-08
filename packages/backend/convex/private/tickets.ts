import { ConvexError, v } from "convex/values";
import { paginationOptsValidator, PaginationResult } from "convex/server";
import { mutation, query, QueryCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import { Doc, Id } from "../_generated/dataModel";

const TICKET_STATUS_LABELS: Record<Doc<"tickets">["status"], string> = {
  open: "🟢 Open",
  in_progress: "🟡 In progress",
  waiting: "🟣 Waiting for you",
  resolved: "✅ Resolved",
  closed: "🔒 Closed",
};

const MAX_BODY_LENGTH = 5000;

const statusValidator = v.union(
  v.literal("open"),
  v.literal("in_progress"),
  v.literal("waiting"),
  v.literal("resolved"),
  v.literal("closed"),
);

const priorityValidator = v.union(
  v.literal("low"),
  v.literal("medium"),
  v.literal("high"),
  v.literal("urgent"),
);

type Identity = {
  orgId?: string;
  subject?: string;
  name?: string;
  givenName?: string;
  familyName?: string;
};

async function requireIdentity(ctx: QueryCtx) {
  const identity = (await ctx.auth.getUserIdentity()) as Identity | null;

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

  return identity as Identity & { orgId: string };
}

async function requireOrgTicket(
  ctx: QueryCtx,
  ticketId: Id<"tickets">,
  orgId: string,
) {
  const ticket = await ctx.db.get(ticketId);

  if (!ticket) {
    throw new ConvexError({ code: "NOT_FOUND", message: "Ticket not found" });
  }

  if (ticket.organizationId !== orgId) {
    throw new ConvexError({
      code: "UNAUTHORIZED",
      message: "Invalid Organization ID",
    });
  }

  return ticket;
}

function agentDisplayName(identity: Identity) {
  return (
    identity.name ||
    [identity.givenName, identity.familyName].filter(Boolean).join(" ") ||
    "Support agent"
  );
}

export const getMany = query({
  args: {
    paginationOpts: paginationOptsValidator,
    status: v.optional(statusValidator),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);

    let tickets: PaginationResult<Doc<"tickets">>;

    if (args.status) {
      tickets = await ctx.db
        .query("tickets")
        .withIndex("by_organization_id_and_status", (q) =>
          q
            .eq("organizationId", identity.orgId)
            .eq("status", args.status as Doc<"tickets">["status"]),
        )
        .order("desc")
        .paginate(args.paginationOpts);
    } else {
      tickets = await ctx.db
        .query("tickets")
        .withIndex("by_organization_id", (q) =>
          q.eq("organizationId", identity.orgId),
        )
        .order("desc")
        .paginate(args.paginationOpts);
    }

    return tickets;
  },
});

export const getCounts = query({
  args: {},
  handler: async (ctx) => {
    const identity = await requireIdentity(ctx);

    const tickets = await ctx.db
      .query("tickets")
      .withIndex("by_organization_id", (q) =>
        q.eq("organizationId", identity.orgId),
      )
      .collect();

    return {
      all: tickets.length,
      open: tickets.filter((ticket) => ticket.status === "open").length,
      in_progress: tickets.filter((ticket) => ticket.status === "in_progress")
        .length,
      waiting: tickets.filter((ticket) => ticket.status === "waiting").length,
      resolved: tickets.filter((ticket) => ticket.status === "resolved").length,
      closed: tickets.filter((ticket) => ticket.status === "closed").length,
    };
  },
});

const BOARD_LIMIT = 300;

/**
 * Flat list for the kanban board. The board needs every column at once, so it
 * can't use pagination - capped instead to keep the payload bounded.
 */
export const getBoard = query({
  args: {},
  handler: async (ctx) => {
    const identity = await requireIdentity(ctx);

    const tickets = await ctx.db
      .query("tickets")
      .withIndex("by_organization_id", (q) =>
        q.eq("organizationId", identity.orgId),
      )
      .order("desc")
      .take(BOARD_LIMIT);

    return {
      tickets,
      // Lets the UI warn instead of silently hiding older tickets
      truncated: tickets.length === BOARD_LIMIT,
    };
  },
});

export const getOne = query({
  args: {
    ticketId: v.id("tickets"),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const ticket = await requireOrgTicket(ctx, args.ticketId, identity.orgId);

    const messages = await ctx.db
      .query("ticketMessages")
      .withIndex("by_ticket_id", (q) => q.eq("ticketId", ticket._id))
      .collect();

    return { ...ticket, messages };
  },
});

export const updateStatus = mutation({
  args: {
    ticketId: v.id("tickets"),
    status: statusValidator,
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const ticket = await requireOrgTicket(ctx, args.ticketId, identity.orgId);

    if (ticket.status === args.status) {
      return;
    }

    await ctx.db.patch(args.ticketId, { status: args.status });

    // Telegram users have no dashboard - tell them the status moved
    await ctx.scheduler.runAfter(
      0,
      internal.system.telegram.deliverTicketUpdate,
      {
        ticketId: args.ticketId,
        text: `🎫 Ticket #${ticket.number} is now ${TICKET_STATUS_LABELS[args.status]}`,
      },
    );
  },
});

export const updatePriority = mutation({
  args: {
    ticketId: v.id("tickets"),
    priority: priorityValidator,
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    await requireOrgTicket(ctx, args.ticketId, identity.orgId);

    await ctx.db.patch(args.ticketId, { priority: args.priority });
  },
});

export const assignToMe = mutation({
  args: {
    ticketId: v.id("tickets"),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const ticket = await requireOrgTicket(ctx, args.ticketId, identity.orgId);

    await ctx.db.patch(args.ticketId, {
      assigneeId: identity.subject,
      assigneeName: agentDisplayName(identity),
      // Picking up a brand new ticket moves it along automatically
      status: ticket.status === "open" ? "in_progress" : ticket.status,
    });
  },
});

export const unassign = mutation({
  args: {
    ticketId: v.id("tickets"),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    await requireOrgTicket(ctx, args.ticketId, identity.orgId);

    await ctx.db.patch(args.ticketId, {
      assigneeId: undefined,
      assigneeName: undefined,
    });
  },
});

export const addMessage = mutation({
  args: {
    ticketId: v.id("tickets"),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const ticket = await requireOrgTicket(ctx, args.ticketId, identity.orgId);

    await ctx.db.insert("ticketMessages", {
      ticketId: ticket._id,
      organizationId: ticket.organizationId,
      authorType: "agent",
      authorName: agentDisplayName(identity),
      body: args.body.slice(0, MAX_BODY_LENGTH),
    });

    // Answering puts the ball back in the customer's court
    await ctx.db.patch(ticket._id, {
      lastMessageAt: Date.now(),
      status: ticket.status === "open" ? "waiting" : ticket.status,
    });

    await ctx.scheduler.runAfter(
      0,
      internal.system.telegram.deliverTicketUpdate,
      {
        ticketId: ticket._id,
        text: `🎫 Ticket #${ticket.number}\n${agentDisplayName(identity)}:\n\n${args.body}`,
      },
    );

    // Keep the GitHub issue readable as one thread, so a developer following it
    // sees the support side without opening Lynq
    const githubLink = await ctx.db
      .query("githubIssueLinks")
      .withIndex("by_ticket_id", (q) => q.eq("ticketId", ticket._id))
      .unique();

    if (githubLink) {
      await ctx.scheduler.runAfter(
        0,
        internal.system.github.mirrorCommentToIssue,
        {
          organizationId: ticket.organizationId,
          issueNumber: githubLink.issueNumber,
          body: `**Support update from Lynq:**\n\n${args.body}`,
        },
      );
    }
  },
});

/**
 * Tickets already opened by the visitor behind a conversation, so an operator
 * can see at a glance whether this issue is already tracked.
 */
export const getByConversationId = query({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);

    const conversation = await ctx.db.get(args.conversationId);

    if (!conversation || conversation.organizationId !== identity.orgId) {
      return [];
    }

    const tickets = await ctx.db
      .query("tickets")
      .withIndex("by_contact_session_id", (q) =>
        q.eq("contactSessionId", conversation.contactSessionId),
      )
      .order("desc")
      .collect();

    return tickets.map((ticket) => ({
      _id: ticket._id,
      number: ticket.number,
      subject: ticket.subject,
      status: ticket.status,
    }));
  },
});

/**
 * Turns a live chat into a tracked ticket. Contact details default to the
 * visitor's contact session but the operator can correct them first.
 */
export const createFromConversation = mutation({
  args: {
    conversationId: v.id("conversations"),
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
    priority: priorityValidator,
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);

    const conversation = await ctx.db.get(args.conversationId);

    if (!conversation) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Conversation not found",
      });
    }

    if (conversation.organizationId !== identity.orgId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Invalid Organization ID",
      });
    }

    const latest = await ctx.db
      .query("tickets")
      .withIndex("by_organization_id_and_number", (q) =>
        q.eq("organizationId", identity.orgId),
      )
      .order("desc")
      .first();

    const number = (latest?.number ?? 0) + 1;
    const now = Date.now();

    const ticketId = await ctx.db.insert("tickets", {
      organizationId: identity.orgId,
      number,
      name: args.name,
      surname: args.surname,
      email: args.email,
      phone: args.phone,
      subject: args.subject.slice(0, 200),
      description: args.description.slice(0, MAX_BODY_LENGTH),
      category: args.category,
      priority: args.priority,
      // The operator is already on it
      status: "in_progress",
      assigneeId: identity.subject,
      assigneeName: agentDisplayName(identity),
      contactSessionId: conversation.contactSessionId,
      lastMessageAt: now,
    });

    await ctx.db.insert("ticketMessages", {
      ticketId,
      organizationId: identity.orgId,
      authorType: "customer",
      authorName: `${args.name} ${args.surname}`.trim(),
      body: args.description.slice(0, MAX_BODY_LENGTH),
    });

    return { ticketId, number };
  },
});

export const remove = mutation({
  args: {
    ticketId: v.id("tickets"),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    await requireOrgTicket(ctx, args.ticketId, identity.orgId);

    const messages = await ctx.db
      .query("ticketMessages")
      .withIndex("by_ticket_id", (q) => q.eq("ticketId", args.ticketId))
      .collect();

    for (const message of messages) {
      await ctx.db.delete(message._id);
    }

    await ctx.db.delete(args.ticketId);
  },
});
