import { StyleSheet, Text, View } from "react-native";
import type { Announcement } from "lynq-sdk-core";

import { CloseButton, CtaButton } from "./primitives";

/**
 * The edge-anchored bar. Positioning is handled by the stack it sits in, so
 * this only paints one row.
 */
export function AnnouncementBanner({
  announcement,
  onDismiss,
}: {
  announcement: Announcement;
  onDismiss: () => void;
}) {
  const { bgColor, ctaLabel, ctaUrl, dismissible, message, textColor, title } =
    announcement;

  return (
    <View style={[styles.banner, { backgroundColor: bgColor }]}>
      <View style={styles.text}>
        {title ? (
          <Text style={[styles.title, { color: textColor }]}>{title}</Text>
        ) : null}
        <Text style={[styles.message, { color: textColor }]}>{message}</Text>
      </View>

      {ctaLabel && ctaUrl ? (
        <CtaButton
          bgColor={bgColor}
          label={ctaLabel}
          textColor={textColor}
          url={ctaUrl}
        />
      ) : null}

      {dismissible ? (
        <CloseButton color={textColor} onPress={onDismiss} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  text: {
    flex: 1,
    // Phones are narrow, so the title sits above the message rather than
    // beside it as it does on the web
    gap: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
  },
});
