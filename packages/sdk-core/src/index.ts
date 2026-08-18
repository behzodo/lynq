/**
 * Platform-free core of the Lynq SDK.
 *
 * Everything here is plain data and rules - what to show, what was already
 * dismissed, how long to wait. Rendering, timers and storage belong to the
 * platform layer on top: `apps/embed` for the browser, the React Native
 * package for apps. Keeping the rules in one place is what stops the two
 * surfaces from quietly disagreeing about, say, how many popups is too many.
 */
export {
  createAnnouncementsFeed,
  type AnnouncementsFeed,
} from "./announcements.js";
export {
  createLynqClient,
  type LynqClient,
  type LynqClientConfig,
} from "./client.js";
export {
  memoryStorage,
  readFlag,
  writeFlag,
  type LynqStorage,
} from "./storage.js";
export { createSurveysFeed, type SurveysFeed } from "./surveys.js";
export type {
  Announcement,
  PendingSurvey,
  Platform,
  Survey,
  SurveyAnswer,
  SurveyResponseMetadata,
} from "./types.js";
