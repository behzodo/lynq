import { createContext, useContext } from "react";
import type { LynqClient, LynqStorage } from "lynq-sdk-core";

/** Extra space to keep clear of the status bar and the home indicator. */
export interface LynqInsets {
  top: number;
  bottom: number;
}

export interface LynqContextValue {
  client: LynqClient;
  storage: LynqStorage;
  insets: LynqInsets;
}

/**
 * Split out from the provider so the overlays can read the context without
 * importing the provider that renders them.
 */
export const LynqContext = createContext<LynqContextValue | null>(null);

export function useLynq(): LynqContextValue {
  const value = useContext(LynqContext);

  if (!value) {
    throw new Error("Wrap your app in <LynqProvider> to use Lynq hooks");
  }

  return value;
}
