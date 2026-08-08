/**
 * Tiny synth for notification chimes.
 *
 * Tones are generated with the Web Audio API instead of shipping audio files,
 * so there is nothing to download and nothing to bundle.
 */

export type NotificationTone = "incoming" | "outgoing";

const TONES: Record<NotificationTone, { frequencies: number[]; gain: number }> = {
  // Rising two-note chime - something arrived
  incoming: { frequencies: [660, 880], gain: 0.16 },
  // Softer, lower single blip - you sent something
  outgoing: { frequencies: [520], gain: 0.09 },
};

const NOTE_DURATION_S = 0.12;

let context: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") {
    return null;
  }

  const AudioContextClass =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;

  if (!AudioContextClass) {
    return null;
  }

  if (!context) {
    context = new AudioContextClass();
  }

  return context;
}

/**
 * Browsers start audio suspended until the user interacts with the page.
 * Call this from a real user gesture to unlock playback.
 */
export function unlockNotificationSound(): void {
  const audio = getContext();

  if (audio && audio.state === "suspended") {
    void audio.resume();
  }
}

export function playNotificationSound(tone: NotificationTone): void {
  const audio = getContext();

  if (!audio) {
    return;
  }

  if (audio.state === "suspended") {
    // Still locked - resume and let the next event make the sound
    void audio.resume();
    return;
  }

  const { frequencies, gain } = TONES[tone];
  const startAt = audio.currentTime;

  frequencies.forEach((frequency, index) => {
    const oscillator = audio.createOscillator();
    const envelope = audio.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = frequency;

    const noteStart = startAt + index * NOTE_DURATION_S;
    const noteEnd = noteStart + NOTE_DURATION_S;

    // Short fade in/out so the note doesn't click
    envelope.gain.setValueAtTime(0.0001, noteStart);
    envelope.gain.exponentialRampToValueAtTime(gain, noteStart + 0.015);
    envelope.gain.exponentialRampToValueAtTime(0.0001, noteEnd);

    oscillator.connect(envelope);
    envelope.connect(audio.destination);

    oscillator.start(noteStart);
    oscillator.stop(noteEnd + 0.02);
  });
}
