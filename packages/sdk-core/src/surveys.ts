import type { LynqClient } from "./client.js";
import { readFlag, writeFlag, type LynqStorage } from "./storage.js";
import type { PendingSurvey, SurveyAnswer } from "./types.js";

/** Unchanged from the original embed script - see announcements.ts. */
const ANSWERED_KEY_PREFIX = "echo_survey_answered_";

export interface SurveysFeed {
  /**
   * The next survey to show and how long to wait, or null if there is none.
   *
   * Waiting is left to the caller: the browser has setTimeout, React Native
   * has an effect, and neither belongs in here.
   */
  load(): Promise<PendingSurvey | null>;
  /** Record the answer locally, then send it. */
  submit(surveyId: string, answer: SurveyAnswer): Promise<void>;
  /**
   * Closing the card without answering. Remembered exactly like an answer, so
   * the same question doesn't reappear on every page view - someone who closed
   * it has told us something too.
   */
  dismiss(surveyId: string): Promise<void>;
}

export function createSurveysFeed(
  client: LynqClient,
  storage: LynqStorage,
): SurveysFeed {
  return {
    async load() {
      const surveys = await client.fetchSurveys();

      // Only the first unanswered survey is offered, so we never stack cards
      for (const survey of surveys) {
        if (await readFlag(storage, ANSWERED_KEY_PREFIX + survey.id)) {
          continue;
        }

        return {
          survey,
          delayMs: Math.max(0, survey.delaySeconds) * 1000,
        };
      }

      return null;
    },

    async submit(surveyId, answer) {
      // Marked first: if the send fails we still don't ask the same person
      // again, which is the kinder of the two failures.
      await writeFlag(storage, ANSWERED_KEY_PREFIX + surveyId);
      await client.submitSurveyResponse(surveyId, answer);
    },

    dismiss: (surveyId) => writeFlag(storage, ANSWERED_KEY_PREFIX + surveyId),
  };
}
