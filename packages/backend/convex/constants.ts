/**
 * How long a contact session lasts without being used.
 *
 * This is what ties someone to their own conversations and tickets, and it is
 * kept only on their device. A day was fine when the widget lived on a
 * website, where people arrive, ask something and leave. In an installed app
 * it meant re-entering a name and email roughly daily just to read your own
 * support history, so the window is now a month.
 *
 * Sessions slide rather than expire on a fixed date - see touchContactSession
 * - so anyone who opens support at all within the window stays signed in.
 */
export const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * How little has to be left before a session is pushed back out to a full
 * SESSION_DURATION_MS.
 *
 * Deliberately a fraction of the duration rather than a fixed few hours: with
 * a month-long window, refreshing only in the last few hours would log out
 * anyone who checks in weekly, because none of their visits would ever land
 * inside that narrow band.
 */
export const SESSION_REFRESH_THRESHOLD_MS = SESSION_DURATION_MS / 2;
