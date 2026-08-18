import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { LynqStorage } from "lynq-sdk-core";

import type { WidgetSettings } from "./api";
import { CONTACT_SESSION_KEY, type WidgetScreen } from "./constants";
import type { LynqTheme } from "./theme";

/**
 * Picks an image to attach to a chat message.
 *
 * Injected rather than imported: an image picker is a native module, and
 * requiring one would cost every host app a custom build even if they never
 * attach anything. Without it the attach button simply isn't shown.
 */
export type LynqImagePicker = () => Promise<{
  uri: string;
  name?: string;
  mimeType?: string;
} | null>;

export interface WidgetContextValue {
  screen: WidgetScreen;
  setScreen: (screen: WidgetScreen) => void;
  organizationId: string;
  /** null until the stored session has been read, then null if there isn't one */
  contactSessionId: string | null;
  saveContactSessionId: (contactSessionId: string) => Promise<void>;
  /** False while the stored session is still being read. */
  sessionRestored: boolean;
  conversationId: string | null;
  setConversationId: (conversationId: string | null) => void;
  ticketId: string | null;
  setTicketId: (ticketId: string | null) => void;
  errorMessage: string | null;
  setErrorMessage: (message: string | null) => void;
  loadingMessage: string | null;
  setLoadingMessage: (message: string | null) => void;
  widgetSettings: WidgetSettings | null;
  setWidgetSettings: (settings: WidgetSettings | null) => void;
  theme: LynqTheme;
  pickImage?: LynqImagePicker;
  /** Closes the whole widget. Absent when it is embedded in a screen. */
  onClose?: () => void;
}

const WidgetContext = createContext<WidgetContextValue | null>(null);

export function useWidget(): WidgetContextValue {
  const value = useContext(WidgetContext);

  if (!value) {
    throw new Error("Widget screens must be rendered inside <LynqWidget>");
  }

  return value;
}

export function WidgetProvider({
  children,
  onClose,
  organizationId,
  pickImage,
  storage,
  theme,
}: {
  children: ReactNode;
  onClose?: () => void;
  organizationId: string;
  pickImage?: LynqImagePicker;
  storage: LynqStorage;
  theme: LynqTheme;
}) {
  const [screen, setScreen] = useState<WidgetScreen>("loading");
  const [contactSessionId, setContactSessionId] = useState<string | null>(null);
  const [sessionRestored, setSessionRestored] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
  const [widgetSettings, setWidgetSettings] = useState<WidgetSettings | null>(
    null,
  );

  const storageKey = `${CONTACT_SESSION_KEY}_${organizationId}`;

  // Read the stored session once. The loading screen waits on sessionRestored
  // rather than assuming "no session" while this is still in flight.
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      let stored: string | null = null;

      try {
        stored = await storage.getItem(storageKey);
      } catch {
        // A broken store just means signing in again
      }

      if (!cancelled) {
        setContactSessionId(stored || null);
        setSessionRestored(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [storage, storageKey]);

  const saveContactSessionId = useCallback(
    async (value: string) => {
      setContactSessionId(value);

      try {
        await storage.setItem(storageKey, value);
      } catch {
        // Not persisted, but usable for this run
      }
    },
    [storage, storageKey],
  );

  const value = useMemo<WidgetContextValue>(
    () => ({
      screen,
      setScreen,
      organizationId,
      contactSessionId,
      saveContactSessionId,
      sessionRestored,
      conversationId,
      setConversationId,
      ticketId,
      setTicketId,
      errorMessage,
      setErrorMessage,
      loadingMessage,
      setLoadingMessage,
      widgetSettings,
      setWidgetSettings,
      theme,
      pickImage,
      onClose,
    }),
    [
      screen,
      organizationId,
      contactSessionId,
      saveContactSessionId,
      sessionRestored,
      conversationId,
      ticketId,
      errorMessage,
      loadingMessage,
      widgetSettings,
      theme,
      pickImage,
      onClose,
    ],
  );

  return (
    <WidgetContext.Provider value={value}>{children}</WidgetContext.Provider>
  );
}
