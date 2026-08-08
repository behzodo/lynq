/**
 * Message storage helpers.
 *
 * Threads and messages still live in the @convex-dev/agent component - it is
 * used purely as a message store now that there is no AI agent. These wrappers
 * keep `components.agent` out of every call site.
 */
import {
  createThread as createAgentThread,
  listMessages as listAgentMessages,
  MessageDoc,
  saveMessage as saveAgentMessage,
} from "@convex-dev/agent";
import type { PaginationOptions, PaginationResult } from "convex/server";
import { components } from "../_generated/api";
import type { MutationCtx, QueryCtx } from "../_generated/server";

export type { MessageDoc };

export async function createThread(
  ctx: MutationCtx,
  args: { userId: string },
): Promise<string> {
  return await createAgentThread(ctx, components.agent, {
    userId: args.userId,
  });
}

export async function listMessages(
  ctx: QueryCtx,
  args: { threadId: string; paginationOpts: PaginationOptions },
): Promise<PaginationResult<MessageDoc>> {
  return await listAgentMessages(ctx, components.agent, {
    threadId: args.threadId,
    paginationOpts: args.paginationOpts,
  });
}

/** A message written by the visitor. */
export async function saveCustomerMessage(
  ctx: MutationCtx,
  args: { threadId: string; prompt: string },
) {
  return await saveAgentMessage(ctx, components.agent, {
    threadId: args.threadId,
    prompt: args.prompt,
  });
}

/** A message written by a human operator (or a system notice). */
export async function saveOperatorMessage(
  ctx: MutationCtx,
  args: { threadId: string; content: string; agentName?: string },
) {
  return await saveAgentMessage(ctx, components.agent, {
    threadId: args.threadId,
    agentName: args.agentName,
    message: {
      role: "assistant",
      content: args.content,
    },
  });
}
