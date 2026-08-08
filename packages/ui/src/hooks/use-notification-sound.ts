"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  NotificationTone,
  playNotificationSound,
  unlockNotificationSound,
} from "../lib/notification-sound";

const MUTED_KEY = "echo_sound_muted";

function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTED_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Plays notification chimes, with a mute preference that survives reloads.
 * Audio is unlocked on the first user gesture, as browsers require.
 */
export function useNotificationSound() {
  const [muted, setMuted] = useState(false);

  // Read after mount so server and client markup match
  useEffect(() => {
    setMuted(readMuted());
  }, []);

  useEffect(() => {
    const unlock = () => unlockNotificationSound();

    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);

    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  const play = useCallback(
    (tone: NotificationTone) => {
      if (muted) {
        return;
      }

      playNotificationSound(tone);
    },
    [muted],
  );

  const toggleMuted = useCallback(() => {
    setMuted((previous) => {
      const next = !previous;

      try {
        localStorage.setItem(MUTED_KEY, next ? "1" : "0");
      } catch {
        // Preference just won't persist
      }

      if (!next) {
        // Unmuting is a user gesture - good moment to unlock audio
        unlockNotificationSound();
        playNotificationSound("outgoing");
      }

      return next;
    });
  }, []);

  return { play, muted, toggleMuted };
}

/**
 * Fires `onIncrease` whenever `count` grows. The first observed value is
 * treated as the baseline, so loading an existing list stays silent.
 */
export function useCountIncrease(
  count: number | undefined,
  onIncrease: () => void,
) {
  const previous = useRef<number | null>(null);
  const callback = useRef(onIncrease);

  callback.current = onIncrease;

  useEffect(() => {
    if (count === undefined) {
      return;
    }

    if (previous.current === null) {
      previous.current = count;
      return;
    }

    if (count > previous.current) {
      callback.current();
    }

    previous.current = count;
  }, [count]);
}
