import type {
  Announcement,
  Platform,
  Survey,
  SurveyAnswer,
} from "./types.js";

export interface LynqClientConfig {
  /**
   * Convex HTTP actions live on the `.site` domain, not `.cloud`.
   * e.g. https://basic-hound-309.convex.site
   */
  convexHttpUrl: string;
  organizationId: string;
  /** Which product this install belongs to. Omit for organization-wide only. */
  departmentId?: string | null;
  /** Omit on the web, where the server already defaults to "web". */
  platform?: Platform;
  /**
   * Called when a request fails. The SDK never throws at the host app - a
   * support widget must not be able to take down the page it is embedded in -
   * so this is the only way a failure becomes visible.
   */
  onError?: (message: string, error: unknown) => void;
}

export interface LynqClient {
  fetchAnnouncements(): Promise<Announcement[]>;
  fetchSurveys(): Promise<Survey[]>;
  submitSurveyResponse(surveyId: string, answer: SurveyAnswer): Promise<void>;
}

export function createLynqClient(config: LynqClientConfig): LynqClient {
  const report = (message: string, error: unknown) => {
    config.onError?.(message, error);
  };

  /**
   * organizationId + departmentId + platform, the three feed filters.
   *
   * Built by hand rather than with URLSearchParams: React Native ships a
   * minimal shim whose `set` is missing, so anything relying on it works in
   * the browser and throws on a phone.
   */
  const feedUrl = (path: string) => {
    const params: Array<[string, string | null | undefined]> = [
      ["organizationId", config.organizationId],
      ["departmentId", config.departmentId],
      ["platform", config.platform],
    ];

    const query = params
      .filter(([, value]) => Boolean(value))
      .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
      .join("&");

    return `${config.convexHttpUrl}${path}?${query}`;
  };

  async function fetchFeed<K extends string, T>(
    path: string,
    key: K,
    label: string,
  ): Promise<T[]> {
    if (!config.convexHttpUrl) {
      return [];
    }

    try {
      const response = await fetch(feedUrl(path));

      if (!response.ok) {
        report(`Failed to load ${label} (${response.status})`, response.status);
        return [];
      }

      const data = (await response.json()) as Partial<Record<K, T[]>>;

      return data[key] ?? [];
    } catch (error) {
      report(`Failed to load ${label}`, error);
      return [];
    }
  }

  return {
    fetchAnnouncements: () =>
      fetchFeed<"announcements", Announcement>(
        "/announcements",
        "announcements",
        "announcements",
      ),

    fetchSurveys: () =>
      fetchFeed<"surveys", Survey>("/surveys", "surveys", "surveys"),

    async submitSurveyResponse(surveyId, answer) {
      try {
        await fetch(`${config.convexHttpUrl}/survey-responses`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            surveyId,
            score: answer.score,
            comment: answer.comment || undefined,
            metadata: answer.metadata,
          }),
        });
      } catch (error) {
        // The answer is already marked answered locally, so a failed send is
        // lost rather than retried. Better than asking the same person twice.
        report("Failed to submit survey response", error);
      }
    },
  };
}
