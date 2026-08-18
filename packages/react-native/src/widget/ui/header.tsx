import type { ReactNode } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { useWidget } from "../context";

/**
 * The coloured band at the top of every screen. The web version paints a
 * gradient artwork behind it; here it is a flat accent, which reads better
 * against a phone's own chrome.
 */
export function WidgetHeader({
  children,
  onBack,
  right,
}: {
  children: ReactNode;
  onBack?: () => void;
  right?: ReactNode;
}) {
  const { onClose, theme } = useWidget();

  return (
    <View style={[styles.header, { backgroundColor: theme.accent }]}>
      <View style={styles.row}>
        {onBack ? (
          <Pressable
            accessibilityLabel="Back"
            accessibilityRole="button"
            hitSlop={10}
            onPress={onBack}
            style={styles.iconButton}
          >
            <Text style={[styles.icon, { color: theme.accentForeground }]}>
              ‹
            </Text>
          </Pressable>
        ) : null}

        <View style={styles.title}>{children}</View>

        {right}

        {onClose ? (
          <Pressable
            accessibilityLabel="Close"
            accessibilityRole="button"
            hitSlop={10}
            onPress={onClose}
            style={styles.iconButton}
          >
            <Text style={[styles.close, { color: theme.accentForeground }]}>
              ✕
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

/** The tall "Hi there 👋" block the entry screens share. */
export function WidgetGreeting({ logoUrl }: { logoUrl?: string | null }) {
  const { theme } = useWidget();

  return (
    <View style={styles.greeting}>
      {logoUrl ? (
        <Image source={{ uri: logoUrl }} style={styles.logo} />
      ) : null}
      <Text style={[styles.greetingLarge, { color: theme.accentForeground }]}>
        Hi there! 👋
      </Text>
      <Text style={[styles.greetingSmall, { color: theme.accentForeground }]}>
        Let&apos;s get you started
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  title: {
    flex: 1,
  },
  iconButton: {
    alignItems: "center",
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  icon: {
    fontSize: 30,
    lineHeight: 32,
  },
  close: {
    fontSize: 16,
  },
  greeting: {
    gap: 4,
    paddingVertical: 8,
  },
  logo: {
    borderRadius: 10,
    height: 36,
    marginBottom: 8,
    width: 36,
  },
  greetingLarge: {
    fontSize: 26,
    fontWeight: "700",
  },
  greetingSmall: {
    fontSize: 15,
    opacity: 0.85,
  },
});
