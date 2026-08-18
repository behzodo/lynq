import type { Doc } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import {
  SESSION_DURATION_MS,
  SESSION_REFRESH_THRESHOLD_MS,
} from "../constants";

/**
 * Slides a contact session's expiry forward once it is more than halfway
 * spent, and returns the session as it now stands.
 *
 * Call this from anywhere a visitor proves they are still around - opening the
 * widget, sending a message. Being used is what keeps a session alive, so
 * someone who keeps talking to support is never signed out mid-conversation.
 *
 * Only refreshing past the halfway mark keeps this from writing on every
 * single call; the common case is a read that changes nothing.
 */
export async function touchContactSession(
  ctx: MutationCtx,
  contactSession: Doc<"contactSessions">,
): Promise<Doc<"contactSessions">> {
  if (contactSession.expiresAt - Date.now() >= SESSION_REFRESH_THRESHOLD_MS) {
    return contactSession;
  }

  const expiresAt = Date.now() + SESSION_DURATION_MS;

  await ctx.db.patch(contactSession._id, { expiresAt });

  return { ...contactSession, expiresAt };
}
