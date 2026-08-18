import { useMemo, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
} from "react-native";
import { ConvexProvider, ConvexReactClient } from "convex/react";

import { useLynq } from "../context";
import { WidgetProvider, type LynqImagePicker } from "./context";
import { WidgetView } from "./widget-view";

export interface LynqWidgetProps {
  /**
   * "launcher" floats a bubble in the corner and opens the widget over the
   * app. "inline" fills whatever it is placed in, for apps that would rather
   * give support its own tab.
   */
  mode?: "launcher" | "inline";
  /**
   * Lets someone attach an image to a chat message. Wrap the host app's image
   * picker; without it the attach button is not shown, which is what keeps
   * this package free of a native dependency.
   */
  pickImage?: LynqImagePicker;
}

/**
 * Chat, inbox and tickets.
 *
 * Convex is provided here rather than around the host app's children on
 * purpose: an app that already uses Convex must keep its own client, and this
 * way ours only ever covers the widget's own tree.
 */
export function LynqWidget({ mode = "launcher", pickImage }: LynqWidgetProps) {
  const { convexUrl, organizationId, storage, theme } = useLynq();
  const [isOpen, setIsOpen] = useState(false);

  // Built here, not in the provider, so an app that only shows announcements
  // never opens a websocket it has no use for.
  const convex = useMemo(
    () =>
      new ConvexReactClient(convexUrl, {
        // Browser-only warning, and constructing it outside one would throw
        unsavedChangesWarning: false,
      }),
    [convexUrl],
  );

  const widget = (onClose?: () => void) => (
    <ConvexProvider client={convex}>
      <WidgetProvider
        onClose={onClose}
        organizationId={organizationId}
        pickImage={pickImage}
        storage={storage}
        theme={theme}
      >
        <WidgetView />
      </WidgetProvider>
    </ConvexProvider>
  );

  if (mode === "inline") {
    return widget();
  }

  return (
    <>
      <Pressable
        accessibilityLabel="Support"
        accessibilityRole="button"
        onPress={() => setIsOpen(true)}
        style={({ pressed }) => [
          styles.launcher,
          {
            backgroundColor: theme.accent,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <Text style={[styles.launcherGlyph, { color: theme.accentForeground }]}>
          💬
        </Text>
      </Pressable>

      <Modal
        animationType="slide"
        onRequestClose={() => setIsOpen(false)}
        presentationStyle="pageSheet"
        visible={isOpen}
      >
        <SafeAreaView
          style={[
            styles.sheet,
            { backgroundColor: theme.background },
            // SafeAreaView covers the iOS sheet; Android needs the status bar
            // accounted for by hand
            Platform.OS === "android"
              ? { paddingTop: StatusBar.currentHeight ?? 0 }
              : null,
          ]}
        >
          {/* Mounted only once opened, so the boot sequence and the
              websocket don't run on every app start */}
          {isOpen ? widget(() => setIsOpen(false)) : null}
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  launcher: {
    alignItems: "center",
    borderRadius: 30,
    bottom: 24,
    elevation: 6,
    height: 60,
    justifyContent: "center",
    position: "absolute",
    right: 20,
    shadowColor: "#000",
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    width: 60,
  },
  launcherGlyph: {
    fontSize: 26,
  },
  sheet: {
    flex: 1,
  },
});
