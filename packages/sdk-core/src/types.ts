/**
 * Wire types for the public announcement and survey feeds.
 *
 * These mirror what `public/announcements.getActive` and
 * `public/surveys.getActive` return - see the Convex functions for the
 * authoritative shape. Kept as plain data so both a DOM renderer and a React
 * Native renderer can consume them unchanged.
 */

/**
 * Where the SDK is running. Sent to the feed endpoints so an announcement
 * aimed at one surface never appears on another - "get our app" belongs on the
 * website, not inside the app.
 */
export type Platform = "web" | "ios" | "android";

export interface Announcement {
  id: string;
  type: "banner" | "popup";
  title: string;
  message: string;
  /** Empty string when there is no button. */
  ctaLabel: string;
  ctaUrl: string;
  bgColor: string;
  textColor: string;
  /** Banners only - popups are always centered. */
  position: "top" | "bottom";
  dismissible: boolean;
}

export interface Survey {
  id: string;
  title: string;
  question: string;
  /** rating = 1-5 stars, nps = 0-10 scale, text = free text only */
  type: "rating" | "nps" | "text";
  commentLabel: string;
  thankYouMessage: string;
  bgColor: string;
  textColor: string;
  position: "bottom-right" | "bottom-left" | "center";
  delaySeconds: number;
}

/** Optional context recorded with a survey response. */
export interface SurveyResponseMetadata {
  /** Page URL on the web; whatever identifies the screen in an app. */
  url?: string;
  userAgent?: string;
}

export interface SurveyAnswer {
  /** Omitted for text-only surveys. */
  score?: number;
  comment?: string;
  metadata?: SurveyResponseMetadata;
}

/** A survey that is due to be shown, and how long to wait first. */
export interface PendingSurvey {
  survey: Survey;
  delayMs: number;
}
