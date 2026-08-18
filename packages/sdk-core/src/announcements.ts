import type { LynqClient } from "./client.js";
import { readFlag, writeFlag, type LynqStorage } from "./storage.js";
import type { Announcement } from "./types.js";

/**
 * Unchanged from the original embed script: existing visitors have already
 * dismissed things under these keys, and renaming them would bring every old
 * banner back at once.
 */
const DISMISS_KEY_PREFIX = "echo_announcement_dismissed_";

export interface AnnouncementsFeed {
  /** Active announcements this person has not dismissed, ready to render. */
  load(): Promise<Announcement[]>;
  /** Remember that this one was closed. */
  dismiss(announcementId: string): Promise<void>;
}

export function createAnnouncementsFeed(
  client: LynqClient,
  storage: LynqStorage,
): AnnouncementsFeed {
  return {
    async load() {
      const announcements = await client.fetchAnnouncements();
      const visible: Announcement[] = [];

      // Only one popup at a time, so we never stack modals on top of each
      // other. Banners are edge-anchored and can safely coexist.
      let popupShown = false;

      for (const announcement of announcements) {
        if (announcement.type === "popup" && popupShown) {
          continue;
        }

        if (await readFlag(storage, DISMISS_KEY_PREFIX + announcement.id)) {
          continue;
        }

        if (announcement.type === "popup") {
          popupShown = true;
        }

        visible.push(announcement);
      }

      return visible;
    },

    dismiss: (announcementId) =>
      writeFlag(storage, DISMISS_KEY_PREFIX + announcementId),
  };
}
