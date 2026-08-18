import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import type { Announcement } from "lynq-sdk-core";

import { CloseButton, CtaButton } from "./primitives";

/**
 * The centered card. A Modal rather than an absolutely positioned View, so it
 * covers navigation headers and tab bars the way a popup is expected to, and
 * so the Android back button closes it.
 */
export function AnnouncementPopup({
  announcement,
  onDismiss,
}: {
  announcement: Announcement;
  onDismiss: () => void;
}) {
  const { bgColor, ctaLabel, ctaUrl, dismissible, message, textColor, title } =
    announcement;

  return (
    <Modal
      animationType="fade"
      onRequestClose={dismissible ? onDismiss : undefined}
      statusBarTranslucent
      transparent
      visible
    >
      <Pressable
        // Tapping the backdrop closes it, but only when closing is allowed
        onPress={dismissible ? onDismiss : undefined}
        style={styles.backdrop}
      >
        {/* Swallows taps so they don't fall through to the backdrop */}
        <Pressable
          onPress={() => {}}
          style={[styles.card, { backgroundColor: bgColor }]}
        >
          {dismissible ? (
            <View style={styles.closeRow}>
              <CloseButton color={textColor} onPress={onDismiss} />
            </View>
          ) : null}

          {title ? (
            <Text style={[styles.title, { color: textColor }]}>{title}</Text>
          ) : null}

          <Text style={[styles.message, { color: textColor }]}>{message}</Text>

          {ctaLabel && ctaUrl ? (
            <View style={styles.ctaRow}>
              <CtaButton
                bgColor={bgColor}
                label={ctaLabel}
                textColor={textColor}
                url={ctaUrl}
              />
            </View>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  card: {
    borderRadius: 16,
    maxWidth: 380,
    padding: 20,
    width: "100%",
  },
  closeRow: {
    alignItems: "flex-end",
    marginBottom: 4,
    marginRight: -8,
    marginTop: -8,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 6,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
  },
  ctaRow: {
    alignItems: "flex-start",
    marginTop: 16,
  },
});
