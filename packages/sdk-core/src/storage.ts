/**
 * Key/value storage the SDK uses to remember what a person has already
 * dismissed or answered.
 *
 * Deliberately an interface rather than a concrete store: the browser has
 * `localStorage` (synchronous, and throwing in private mode), React Native has
 * AsyncStorage (a promise). Both satisfy this, so the rules in this package
 * never have to care which one they got.
 */
export interface LynqStorage {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<void>;
}

/**
 * Fallback for when no store is supplied. Nothing survives a reload, so a
 * dismissed banner comes back - which is the right failure: mildly annoying,
 * never broken.
 */
export function memoryStorage(): LynqStorage {
  const values = new Map<string, string>();

  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
}

/**
 * Storage is the least reliable thing the SDK touches - private browsing, a
 * full quota, a detached AsyncStorage native module. A failed read counts as
 * "not seen yet" and a failed write is dropped, so a broken store degrades to
 * showing things again rather than to a crash.
 */
export async function readFlag(
  storage: LynqStorage,
  key: string,
): Promise<boolean> {
  try {
    return (await storage.getItem(key)) === "1";
  } catch {
    return false;
  }
}

export async function writeFlag(
  storage: LynqStorage,
  key: string,
): Promise<void> {
  try {
    await storage.setItem(key, "1");
  } catch {
    // Ignore - the flag simply won't persist
  }
}
