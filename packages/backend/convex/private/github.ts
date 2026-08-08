import { ConvexError, v } from "convex/values";
import {
  action,
  internalQuery,
  mutation,
  query,
} from "../_generated/server";
import { internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";

async function requireOrgId(ctx: {
  auth: { getUserIdentity: () => Promise<unknown> };
}) {
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

/** Connection state for the settings screen. Never exposes tokens. */
export const getConnection = query({
  args: {},
  handler: async (ctx) => {
    const orgId = await requireOrgId(ctx);

    const installation = await ctx.db
      .query("githubInstallations")
      .withIndex("by_organization_id", (q) => q.eq("organizationId", orgId))
      .unique();

    if (!installation) {
      return null;
    }

    return {
      accountLogin: installation.accountLogin,
      repoOwner: installation.repoOwner ?? null,
      repoName: installation.repoName ?? null,
      projectTitle: installation.projectTitle ?? null,
      projectNumber: installation.projectNumber ?? null,
      statusOptions: installation.statusOptions ?? [],
      backlogOptionId: installation.backlogOptionId ?? null,
      isActive: installation.isActive,
      isConfigured: Boolean(installation.repoOwner && installation.repoName),
    };
  },
});

/**
 * Called after the GitHub App install redirect. The installation id proves the
 * user completed the install, and the org comes from their session.
 */
export const completeInstall = mutation({
  args: {
    installationId: v.number(),
    accountLogin: v.string(),
  },
  handler: async (ctx, args) => {
    const orgId = await requireOrgId(ctx);

    const existing = await ctx.db
      .query("githubInstallations")
      .withIndex("by_organization_id", (q) => q.eq("organizationId", orgId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        installationId: args.installationId,
        accountLogin: args.accountLogin,
        isActive: true,
      });

      return;
    }

    await ctx.db.insert("githubInstallations", {
      organizationId: orgId,
      installationId: args.installationId,
      accountLogin: args.accountLogin,
      isActive: true,
    });
  },
});

/** Repos and boards to choose between, read live from GitHub. */
export const listTargets = action({
  args: {},
  handler: async (
    ctx,
  ): Promise<{
    repos: { owner: string; name: string; fullName: string; private: boolean }[];
    projects: {
      nodeId: string;
      number: number;
      title: string;
      statusFieldId?: string;
      statusOptions: { id: string; name: string }[];
    }[];
  }> => {
    const orgId = await requireOrgId(ctx);

    const installation = await ctx.runQuery(
      internal.system.github.getInstallation,
      { organizationId: orgId },
    );

    if (!installation?.isActive) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "GitHub is not connected",
      });
    }

    return await ctx.runAction(internal.system.github.listTargets, {
      installationId: installation.installationId,
      accountLogin: installation.accountLogin,
    });
  },
});

export const saveConfig = mutation({
  args: {
    repoOwner: v.string(),
    repoName: v.string(),
    projectNodeId: v.optional(v.string()),
    projectNumber: v.optional(v.number()),
    projectTitle: v.optional(v.string()),
    statusFieldId: v.optional(v.string()),
    statusOptions: v.optional(
      v.array(v.object({ id: v.string(), name: v.string() })),
    ),
    backlogOptionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const orgId = await requireOrgId(ctx);

    const installation = await ctx.db
      .query("githubInstallations")
      .withIndex("by_organization_id", (q) => q.eq("organizationId", orgId))
      .unique();

    if (!installation) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "GitHub is not connected",
      });
    }

    await ctx.db.patch(installation._id, args);
  },
});

export const disconnect = mutation({
  args: {},
  handler: async (ctx) => {
    const orgId = await requireOrgId(ctx);

    const installation = await ctx.db
      .query("githubInstallations")
      .withIndex("by_organization_id", (q) => q.eq("organizationId", orgId))
      .unique();

    if (installation) {
      await ctx.db.delete(installation._id);
    }
  },
});

/** The GitHub link shown on a ticket, if any. */
export const getTicketLink = query({
  args: { ticketId: v.id("tickets") },
  handler: async (ctx, args) => {
    const orgId = await requireOrgId(ctx);

    const link = await ctx.db
      .query("githubIssueLinks")
      .withIndex("by_ticket_id", (q) => q.eq("ticketId", args.ticketId))
      .unique();

    if (!link || link.organizationId !== orgId) {
      return null;
    }

    return {
      issueNumber: link.issueNumber,
      issueUrl: link.issueUrl,
      issueState: link.issueState,
      closedReason: link.closedReason ?? null,
      boardColumn: link.boardColumn ?? null,
      closedAt: link.closedAt ?? null,
      customerNotifiedAt: link.customerNotifiedAt ?? null,
      // Only offer the nudge for a genuine fix that has not been announced yet
      canNotifyCustomer:
        link.issueState === "closed" &&
        link.closedReason !== "not_planned" &&
        !link.customerNotifiedAt,
    };
  },
});

/** Creates the GitHub issue for a ticket and links the two. */
export const createIssueForTicket = action({
  args: {
    ticketId: v.id("tickets"),
    includeConversation: v.boolean(),
    dashboardUrl: v.string(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ issueNumber: number; issueUrl: string }> => {
    const orgId = await requireOrgId(ctx);

    const context = await ctx.runQuery(
      internal.private.github.getTicketForIssue,
      { ticketId: args.ticketId, organizationId: orgId },
    );

    return await ctx.runAction(internal.system.github.createIssueForTicket, {
      organizationId: orgId,
      ticketId: args.ticketId,
      ticketNumber: context.ticket.number,
      subject: context.ticket.subject,
      description: context.ticket.description,
      category: context.ticket.category,
      priority: context.ticket.priority,
      ticketUrl: `${args.dashboardUrl}/tickets/${args.ticketId}`,
      includeConversation: args.includeConversation,
      messages: context.messages,
    });
  },
});

/**
 * Ticket plus transcript. Internal: the organization is passed in by the action
 * that already verified it, and this is never callable from a browser.
 */
export const getTicketForIssue = internalQuery({
  args: { ticketId: v.id("tickets"), organizationId: v.string() },
  handler: async (ctx, args) => {
    const ticket = await ctx.db.get(args.ticketId);

    if (!ticket || ticket.organizationId !== args.organizationId) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Ticket not found",
      });
    }

    const existing = await ctx.db
      .query("githubIssueLinks")
      .withIndex("by_ticket_id", (q) => q.eq("ticketId", args.ticketId))
      .unique();

    if (existing) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: `Already tracked as issue #${existing.issueNumber}`,
      });
    }

    const messages = await ctx.db
      .query("ticketMessages")
      .withIndex("by_ticket_id", (q) => q.eq("ticketId", args.ticketId))
      .collect();

    return {
      ticket: {
        number: ticket.number,
        subject: ticket.subject,
        description: ticket.description,
        category: ticket.category,
        priority: ticket.priority,
      },
      messages: messages.map((message) => ({
        authorType: message.authorType,
        authorName: message.authorName,
        body: message.body,
      })),
    };
  },
});

/**
 * Suggested wording for the "it's fixed" message. A human still sends it - a
 * developer closing an issue is not the same as a customer being told.
 */
export const getFixedDraft = query({
  args: { ticketId: v.id("tickets") },
  handler: async (ctx, args) => {
    const orgId = await requireOrgId(ctx);

    const ticket = await ctx.db.get(args.ticketId);

    if (!ticket || ticket.organizationId !== orgId) {
      return null;
    }

    return [
      `Hi ${ticket.name},`,
      "",
      `Good news — the issue you reported ("${ticket.subject}") has been fixed and the change is live.`,
      "",
      "Please give it another try and let us know if anything still looks wrong. Thanks for reporting it.",
    ].join("\n");
  },
});

/** Sends the message to the customer and stops us offering it again. */
export const notifyCustomerFixed = mutation({
  args: { ticketId: v.id("tickets"), body: v.string() },
  handler: async (ctx, args) => {
    const orgId = await requireOrgId(ctx);
    const identity = (await ctx.auth.getUserIdentity()) as {
      name?: string;
      email?: string;
    } | null;

    const ticket = await ctx.db.get(args.ticketId);

    if (!ticket || ticket.organizationId !== orgId) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Ticket not found" });
    }

    const link = await ctx.db
      .query("githubIssueLinks")
      .withIndex("by_ticket_id", (q) => q.eq("ticketId", args.ticketId))
      .unique();

    await ctx.db.insert("ticketMessages", {
      ticketId: args.ticketId,
      organizationId: ticket.organizationId,
      authorType: "agent",
      authorName: identity?.name || identity?.email || "Support",
      body: args.body,
    });

    await ctx.db.patch(args.ticketId, {
      lastMessageAt: Date.now(),
      status: "resolved",
    });

    if (link) {
      await ctx.db.patch(link._id, { customerNotifiedAt: Date.now() });
    }

    // Telegram-connected visitors get it in the same place they were talking
    await ctx.scheduler.runAfter(
      0,
      internal.system.telegram.deliverTicketUpdate,
      {
        ticketId: args.ticketId as Id<"tickets">,
        text: `🎫 Ticket #${ticket.number}\n\n${args.body}`,
      },
    );
  },
});
