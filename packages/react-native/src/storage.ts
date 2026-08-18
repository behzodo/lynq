import type { LynqStorage } from "lynq-sdk-core";

/** The slice of AsyncStorage the SDK needs. */
export interface AsyncStorageLike {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

/**
 * Hands AsyncStorage to the SDK without depending on it.
 *
 * The host app already has @react-native-async-storage/async-storage; making
 * it a peer dependency here would only add a version to argue about. The shape
 * already matches LynqStorage, so this is a named, type-checked seam rather
 * than a conversion.
 *
 *   <LynqProvider storage={asyncStorage(AsyncStorage)} ... />
 *
 * Without it the SDK falls back to in-memory storage, and a dismissed banner
 * comes back the next time the app is launched.
 */
export const asyncStorage = (store: AsyncStorageLike): LynqStorage => store;
