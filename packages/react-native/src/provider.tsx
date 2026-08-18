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
import { buildTheme } from "./widget/theme";

export interface LynqProviderProps {
  /**
   * The deployment URL Convex gives you, e.g.
   * https://basic-hound-309.convex.cloud
   */
  convexUrl: string;
  /**
   * Overrides where the announcement and survey feeds are read from. Convex
   * serves HTTP actions from the .site twin of the .cloud URL, which is worked
   * out automatically; set this only for a custom or self-hosted domain, where
   * that pattern doesn't hold.
   */
  convexHttpUrl?: string;
  organizationId: string;
  /** The widget's brand colour. Defaults to near-black. */
  accentColor?: string;
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

/** Convex serves HTTP actions from the .site twin of the .cloud URL. */
const siteUrlFrom = (convexUrl: string) =>
  convexUrl.replace(/\/+$/, "").replace(/\.convex\.cloud$/, ".convex.site");

export function LynqProvider({
  accentColor,
  convexHttpUrl,
  convexUrl,
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
        convexHttpUrl: convexHttpUrl ?? siteUrlFrom(convexUrl),
        organizationId,
        departmentId,
        platform: platform ?? currentPlatform(),
        onError,
      }),
      storage: storage ?? memoryStorage(),
      insets: resolveInsets({ top: insetTop, bottom: insetBottom }),
      organizationId,
      convexUrl,
      theme: buildTheme(accentColor),
    }),
    [
      accentColor,
      convexHttpUrl,
      convexUrl,
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
