import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery } from "../_generated/server";
import { internal } from "../_generated/api";
import {
  addIssueToProject,
  commentOnIssue,
  createIssue,
  getInstallationAccount,
  getInstallationToken,
  listInstallationRepos,
  listProjects,
  setProjectItemStatus,
} from "../lib/github";

export const getInstallation = internalQuery({
  args: { organizationId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("githubInstallations")
      .withIndex("by_organization_id", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .unique();
  },
});

export const getInstallationByInstallationId = internalQuery({
  args: { installationId: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("githubInstallations")
      .withIndex("by_installation_id", (q) =>
        q.eq("installationId", args.installationId),
      )
      .unique();
  },
});

export const setAccountLogin = internalMutation({
  args: { installationId: v.number(), accountLogin: v.string() },
  handler: async (ctx, args) => {
    const installation = await ctx.db
      .query("githubInstallations")
      .withIndex("by_installation_id", (q) =>
        q.eq("installationId", args.installationId),
      )
      .unique();

    if (installation && installation.accountLogin !== args.accountLogin) {
      await ctx.db.patch(installation._id, { accountLogin: args.accountLogin });
    }
  },
});

/** Repos and boards the installation can see, for the settings screen. */
export const listTargets = internalAction({
  args: { installationId: v.number() },
  handler: async (ctx, args) => {
    // Read the owner from GitHub rather than the install redirect, which does
    // not reliably include it
    const account = await getInstallationAccount(args.installationId);

    await ctx.runMutation(internal.system.github.setAccountLogin, {
      installationId: args.installationId,
      accountLogin: account.login,
    });

    const token = await getInstallationToken(args.installationId);

    const repos = await listInstallationRepos(token);

    // Projects v2 is only reachable for organization installations - the
    // Projects permission does not exist for user accounts
    const projects =
      account.type === "Organization"
        ? await listProjects(token, account.login)
        : [];

    return {
      repos,
      projects,
      accountLogin: account.login,
      accountType: account.type,
      supportsProjects: account.type === "Organization",
    };
  },
});

/**
 * Customer identity is stripped by default: GitHub issues are frequently public
 * and permanent, and a support thread can contain anything.
 */
function buildIssueBody(args: {
  ticketNumber: number;
  category: string;
  priority: string;
  description: string;
  ticketUrl: string;
  messages: { authorType: string; authorName: string; body: string }[];
  includeConversation: boolean;
}) {
  const lines = [
    args.description.trim(),
    "",
    "---",
    "",
    `**Category** \`${args.category}\`  |  **Priority** \`${args.priority}\``,
    "",
  ];

  if (args.includeConversation && args.messages.length > 0) {
    lines.push("<details>", "<summary>Support conversation</summary>", "");

    for (const message of args.messages) {
      // Names are deliberately generalised - the transcript is the useful part,
      // not who wrote it
      const who = message.authorType === "customer" ? "Customer" : "Support";
      lines.push(`**${who}:** ${message.body.trim()}`, "");
    }

    lines.push("</details>", "");
  } else {
    lines.push(
      "_Conversation withheld. Open the ticket in Lynq for full context._",
      "",
    );
  }

  lines.push(
    `Tracked from Lynq ticket #${args.ticketNumber} · [open ticket](${args.ticketUrl})`,
  );

  return lines.join("\n");
}

/**
 * Creates the issue, puts it on the board in the configured column, and records
 * the link. Runs as an action because it talks to GitHub.
 */
export const createIssueForTicket = internalAction({
  args: {
    organizationId: v.string(),
    ticketId: v.id("tickets"),
    ticketNumber: v.number(),
    subject: v.string(),
    description: v.string(),
    category: v.string(),
    priority: v.string(),
    ticketUrl: v.string(),
    includeConversation: v.boolean(),
    messages: v.array(
      v.object({
        authorType: v.string(),
        authorName: v.string(),
        body: v.string(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const installation = await ctx.runQuery(
      internal.system.github.getInstallation,
      { organizationId: args.organizationId },
    );

    if (!installation?.isActive || !installation.repoOwner || !installation.repoName) {
      throw new Error("GitHub is not connected for this organization");
    }

    const token = await getInstallationToken(installation.installationId);

    const issue = await createIssue(token, {
      owner: installation.repoOwner,
      repo: installation.repoName,
      title: `${args.subject} (Lynq #${args.ticketNumber})`,
      body: buildIssueBody({ ...args }),
      labels: ["lynq", args.category],
    });

    let projectItemId: string | undefined;

    // The board is optional: a failure here must not lose the created issue
    if (installation.projectNodeId) {
      try {
        projectItemId = await addIssueToProject(token, {
          projectNodeId: installation.projectNodeId,
          issueNodeId: issue.node_id,
        });

        if (installation.statusFieldId && installation.backlogOptionId) {
          await setProjectItemStatus(token, {
            projectNodeId: installation.projectNodeId,
            itemId: projectItemId,
            statusFieldId: installation.statusFieldId,
            optionId: installation.backlogOptionId,
          });
        }
      } catch (error) {
        console.error("Could not add the issue to the project board", error);
      }
    }

    await ctx.runMutation(internal.system.github.saveIssueLink, {
      organizationId: args.organizationId,
      ticketId: args.ticketId,
      issueNumber: issue.number,
      issueNodeId: issue.node_id,
      issueUrl: issue.html_url,
      projectItemId,
    });

    return { issueNumber: issue.number, issueUrl: issue.html_url };
  },
});

export const saveIssueLink = internalMutation({
  args: {
    organizationId: v.string(),
    ticketId: v.id("tickets"),
    issueNumber: v.number(),
    issueNodeId: v.string(),
    issueUrl: v.string(),
    projectItemId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("githubIssueLinks", {
      ...args,
      issueState: "open",
    });
  },
});

/** Mirrors a webhook's view of the issue onto the link row. */
export const applyIssueState = internalMutation({
  args: {
    issueNodeId: v.string(),
    issueState: v.union(v.literal("open"), v.literal("closed")),
    closedReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const link = await ctx.db
      .query("githubIssueLinks")
      .withIndex("by_issue_node_id", (q) =>
        q.eq("issueNodeId", args.issueNodeId),
      )
      .unique();

    if (!link) {
      return null;
    }

    await ctx.db.patch(link._id, {
      issueState: args.issueState,
      closedReason: args.closedReason,
      closedAt: args.issueState === "closed" ? Date.now() : undefined,
    });

    const ticket = await ctx.db.get(link.ticketId);

    if (!ticket) {
      return null;
    }

    // GitHub owns status for linked tickets, so this write is one-directional
    // and never echoed back
    if (args.issueState === "closed") {
      // Closed as duplicate or won't-do is not a fix, so the ticket is only
      // parked rather than resolved
      const isFixed = args.closedReason !== "not_planned";

      await ctx.db.patch(link.ticketId, {
        status: isFixed ? "resolved" : "closed",
      });
    } else if (ticket.status === "resolved" || ticket.status === "closed") {
      await ctx.db.patch(link.ticketId, { status: "in_progress" });
    }

    return { ticketId: link.ticketId };
  },
});

/** Records the board column an item moved to, for display in Lynq. */
export const applyBoardColumn = internalMutation({
  args: { issueNodeId: v.string(), boardColumn: v.string() },
  handler: async (ctx, args) => {
    const link = await ctx.db
      .query("githubIssueLinks")
      .withIndex("by_issue_node_id", (q) =>
        q.eq("issueNodeId", args.issueNodeId),
      )
      .unique();

    if (!link) {
      return;
    }

    await ctx.db.patch(link._id, { boardColumn: args.boardColumn });

    const ticket = await ctx.db.get(link.ticketId);

    // Only nudge the ticket forward; anything terminal is driven by issue state
    if (
      ticket &&
      ticket.status === "open" &&
      /progress|doing|review/i.test(args.boardColumn)
    ) {
      await ctx.db.patch(link.ticketId, { status: "in_progress" });
    }
  },
});

export const markInstallationRemoved = internalMutation({
  args: { installationId: v.number() },
  handler: async (ctx, args) => {
    const installation = await ctx.db
      .query("githubInstallations")
      .withIndex("by_installation_id", (q) =>
        q.eq("installationId", args.installationId),
      )
      .unique();

    if (installation) {
      await ctx.db.patch(installation._id, { isActive: false });
    }
  },
});

/** Idempotency gate: returns false when this delivery was already handled. */
export const claimDelivery = internalMutation({
  args: { deliveryId: v.string(), event: v.string() },
  handler: async (ctx, args) => {
    const seen = await ctx.db
      .query("githubWebhookDeliveries")
      .withIndex("by_delivery_id", (q) => q.eq("deliveryId", args.deliveryId))
      .unique();

    if (seen) {
      return false;
    }

    await ctx.db.insert("githubWebhookDeliveries", {
      deliveryId: args.deliveryId,
      event: args.event,
      receivedAt: Date.now(),
    });

    return true;
  },
});

/** Posts the admin's reply back onto the GitHub issue, keeping one thread. */
export const mirrorCommentToIssue = internalAction({
  args: {
    organizationId: v.string(),
    issueNumber: v.number(),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const installation = await ctx.runQuery(
      internal.system.github.getInstallation,
      { organizationId: args.organizationId },
    );

    if (
      !installation?.isActive ||
      !installation.repoOwner ||
      !installation.repoName
    ) {
      return;
    }

    try {
      const token = await getInstallationToken(installation.installationId);

      await commentOnIssue(token, {
        owner: installation.repoOwner,
        repo: installation.repoName,
        issueNumber: args.issueNumber,
        body: args.body,
      });
    } catch (error) {
      // A failed mirror must not fail the reply the admin already sent
      console.error("Could not mirror the comment to GitHub", error);
    }
  },
});
