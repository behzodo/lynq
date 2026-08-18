/**
 * Lynq for React Native and Expo.
 *
 * The rules live in lynq-sdk-core, shared with the browser embed, so an
 * announcement behaves the same on a phone as it does on the website. This
 * package is the part that has to be native: rendering, timers and storage.
 */
export { LynqProvider, type LynqProviderProps } from "./provider";
export { useLynq, type LynqContextValue, type LynqInsets } from "./context";
export {
  useAnnouncements,
  useSurvey,
  type UseAnnouncements,
  type UseSurvey,
} from "./hooks";
export { asyncStorage, type AsyncStorageLike } from "./storage";
export { currentPlatform, openCta } from "./platform";

// Exported so an app that sets autoRender={false} can still reuse the pieces
export { LynqOverlays } from "./components/lynq-overlays";
export { AnnouncementBanner } from "./components/announcement-banner";
export { AnnouncementPopup } from "./components/announcement-popup";
export { SurveyCard } from "./components/survey-card";

export type {
  Announcement,
  Platform,
  Survey,
  SurveyAnswer,
  LynqStorage,
} from "lynq-sdk-core";
