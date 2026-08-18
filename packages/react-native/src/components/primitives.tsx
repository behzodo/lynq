import { Pressable, StyleSheet, Text } from "react-native";

import { openCta } from "../platform";

/**
 * The call-to-action button, painted in the announcement's colours inverted -
 * the same treatment the web embed gives it.
 */
export function CtaButton({
  bgColor,
  label,
  textColor,
  url,
}: {
  bgColor: string;
  label: string;
  textColor: string;
  url: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        void openCta(url);
      }}
      style={({ pressed }) => [
        styles.cta,
        { backgroundColor: textColor, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <Text numberOfLines={1} style={[styles.ctaLabel, { color: bgColor }]}>
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * Close control. A text glyph rather than an icon, so the package stays free
 * of an icon dependency the host app would also have to install.
 */
export function CloseButton({
  color,
  onPress,
}: {
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel="Dismiss"
      accessibilityRole="button"
      // Comfortably past the 44pt minimum without making the glyph bigger
      hitSlop={12}
      onPress={onPress}
      style={({ pressed }) => [styles.close, { opacity: pressed ? 1 : 0.7 }]}
    >
      <Text style={[styles.closeGlyph, { color }]}>✕</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cta: {
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  ctaLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  close: {
    alignItems: "center",
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  closeGlyph: {
    fontSize: 15,
    lineHeight: 18,
  },
});
