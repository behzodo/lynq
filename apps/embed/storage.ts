import type { LynqStorage } from '@workspace/sdk-core';

/**
 * localStorage, which throws instead of returning null in private mode and in
 * some sandboxed iframes. sdk-core already wraps every read and write in a
 * try/catch, so this only has to hand over the raw calls.
 */
export const webStorage: LynqStorage = {
  getItem: (key) => localStorage.getItem(key),
  setItem: (key, value) => localStorage.setItem(key, value),
};
