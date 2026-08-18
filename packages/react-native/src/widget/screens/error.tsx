import { StyleSheet, Text, View } from "react-native";

import { useWidget } from "../context";
import { WidgetGreeting, WidgetHeader } from "../ui/header";

export function ErrorScreen() {
  const { errorMessage, theme } = useWidget();

  return (
    <>
      <WidgetHeader>
        <WidgetGreeting />
      </WidgetHeader>
      <View style={styles.body}>
        <Text style={styles.glyph}>⚠️</Text>
        <Text style={[styles.message, { color: theme.mutedForeground }]}>
          {errorMessage || "Invalid configuration"}
        </Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  body: {
    alignItems: "center",
    flex: 1,
    gap: 12,
    justifyContent: "center",
    padding: 16,
  },
  glyph: {
    fontSize: 28,
  },
  message: {
    fontSize: 13,
    textAlign: "center",
  },
});
