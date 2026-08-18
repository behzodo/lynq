import { useMemo, type ReactNode } from "react";
import { Platform as ReactNativePlatform, StatusBar } from "react-native";
import {
  createLynqClient,
  memoryStorage,
  type LynqStorage,
  type Platform,
} from "lynq-sdk-core";

import { LynqOverlays } from "./components/lynq-overlays";
import {
  LynqContext,
  type LynqContextValue,
  type LynqInsets,
} from "./context";
import { currentPlatform } from "./platform";

export interface LynqProviderProps {
  /**
   * Convex HTTP actions live on the `.site` domain, not `.cloud`.
   * e.g. https://basic-hound-309.convex.site
   */
  convexHttpUrl: string;
  organizationId: string;
  /** Which product this app is. Omit for organization-wide only. */
  departmentId?: string | null;
  /** Defaults to the running platform. Override only for testing. */
  platform?: Platform;
  /**
   * Where dismissals are remembered. Pass `asyncStorage(AsyncStorage)`; the
   * default keeps them in memory only, so a dismissed banner comes back the
   * next time the app starts.
   */
  storage?: LynqStorage;
  /**
   * Overrides the safe-area padding. Pass the values from
   * react-native-safe-area-context if the app already has it - what is built
   * in here only knows about the Android status bar and the iOS safe area.
   */
  insets?: Partial<LynqInsets>;
  onError?: (message: string, error: unknown) => void;
  /**
   * Set false to render nothing automatically and drive the UI yourself with
   * useAnnouncements() and useSurvey().
   */
  autoRender?: boolean;
  children?: ReactNode;
}

/**
 * The Android status bar is the one inset readable without another dependency.
 * iOS is handled by the SafeAreaView the banners sit inside, which is why the
 * default there is zero rather than a guessed notch height.
 */
const resolveInsets = (override?: Partial<LynqInsets>): LynqInsets => ({
  top:
    override?.top ??
    (ReactNativePlatform.OS === "android" ? (StatusBar.currentHeight ?? 0) : 0),
  bottom: override?.bottom ?? 0,
});

export function LynqProvider({
  convexHttpUrl,
  organizationId,
  departmentId,
  platform,
  storage,
  insets,
  onError,
  autoRender = true,
  children,
}: LynqProviderProps) {
  const insetTop = insets?.top;
  const insetBottom = insets?.bottom;

  const value = useMemo<LynqContextValue>(
    () => ({
      client: createLynqClient({
        convexHttpUrl,
        organizationId,
        departmentId,
        platform: platform ?? currentPlatform(),
        onError,
      }),
      storage: storage ?? memoryStorage(),
      insets: resolveInsets({ top: insetTop, bottom: insetBottom }),
    }),
    [
      convexHttpUrl,
      organizationId,
      departmentId,
      platform,
      storage,
      insetTop,
      insetBottom,
      onError,
    ],
  );

  return (
    <LynqContext.Provider value={value}>
      {children}
      {/* After children, so it paints above them without needing a z-index */}
      {autoRender ? <LynqOverlays /> : null}
    </LynqContext.Provider>
  );
}
