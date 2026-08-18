import { Linking, Platform as ReactNativePlatform } from "react-native";
import type { Platform } from "lynq-sdk-core";

/**
 * Which feed this app should ask for. react-native-web reports "web", which is
 * exactly what it should send.
 */
export function currentPlatform(): Platform {
  switch (ReactNativePlatform.OS) {
    case "ios":
      return "ios";
    case "android":
      return "android";
    default:
      return "web";
  }
}

/**
 * Open an announcement's call to action.
 *
 * A deep link into this app ("stok://product/123") and an ordinary https link
 * both go through Linking - the OS picks who handles it. We deliberately do
 * not check canOpenURL first: on Android 11+ it answers false for any scheme
 * the host app hasn't listed in its manifest `queries`, which would silently
 * kill working deep links. Trying and catching gets the same protection
 * without the false negatives.
 */
export async function openCta(url: string): Promise<boolean> {
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}
