import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";
import {
  createAnnouncementsFeed,
  createSurveysFeed,
  type Announcement,
  type Survey,
  type SurveyAnswer,
} from "lynq-sdk-core";

import { useLynq } from "./context";

export interface UseAnnouncements {
  /** Live announcements this person has not dismissed. */
  announcements: Announcement[];
  /** Hide one and remember it. */
  dismiss: (announcementId: string) => Promise<void>;
  reload: () => Promise<void>;
}

export function useAnnouncements(): UseAnnouncements {
  const { client, storage } = useLynq();
  const feed = useMemo(
    () => createAnnouncementsFeed(client, storage),
    [client, storage],
  );

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  const reload = useCallback(async () => {
    setAnnouncements(await feed.load());
  }, [feed]);

  useEffect(() => {
    void reload();
  }, [reload]);

  /**
   * A website gets a fresh feed on every page load. An app can sit in the
   * background for days, so returning to the foreground is the equivalent
   * moment to check for anything new.
   */
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void reload();
      }
    });

    return () => subscription.remove();
  }, [reload]);

  const dismiss = useCallback(
    async (announcementId: string) => {
      // Hide first: waiting on storage would leave the banner up for a frame
      setAnnouncements((current) =>
        current.filter((announcement) => announcement.id !== announcementId),
      );
      await feed.dismiss(announcementId);
    },
    [feed],
  );

  return { announcements, dismiss, reload };
}

export interface UseSurvey {
  /** The survey to show right now, once its delay has passed. */
  survey: Survey | null;
  submit: (answer: SurveyAnswer) => Promise<void>;
  /** Closed without answering - remembered so it doesn't ask again. */
  dismiss: () => Promise<void>;
}

export function useSurvey(): UseSurvey {
  const { client, storage } = useLynq();
  const feed = useMemo(
    () => createSurveysFeed(client, storage),
    [client, storage],
  );

  const [survey, setSurvey] = useState<Survey | null>(null);
  // Kept in a ref so submit and dismiss don't have to be rebuilt whenever the
  // survey appears or goes away
  const activeId = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    void (async () => {
      const pending = await feed.load();

      if (cancelled || !pending) {
        return;
      }

      // A timer, not a schedule: if the app is backgrounded before it fires,
      // the survey simply waits for the next launch, which is the behaviour a
      // website has anyway.
      timer = setTimeout(() => {
        if (cancelled) {
          return;
        }

        activeId.current = pending.survey.id;
        setSurvey(pending.survey);
      }, pending.delayMs);
    })();

    return () => {
      cancelled = true;

      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [feed]);

  const close = useCallback(async (send: (id: string) => Promise<void>) => {
    const id = activeId.current;

    if (!id) {
      return;
    }

    activeId.current = null;
    await send(id);
  }, []);

  const submit = useCallback(
    async (answer: SurveyAnswer) => {
      // The card shows its thank-you itself, so the survey stays mounted here
      await close((id) => feed.submit(id, answer));
    },
    [close, feed],
  );

  const dismiss = useCallback(async () => {
    setSurvey(null);
    await close((id) => feed.dismiss(id));
  }, [close, feed]);

  return { survey, submit, dismiss };
}
