import { Pressable, StyleSheet, Text, View } from "react-native";

import { useWidget } from "../context";
import type { WidgetScreen } from "../constants";

const TABS: { key: WidgetScreen; label: string; glyph: string }[] = [
  { key: "selection", label: "Home", glyph: "⌂" },
  { key: "inbox", label: "Inbox", glyph: "✉" },
];

/** Home / Inbox tabs, matching the web widget's footer. */
export function WidgetFooter() {
  const { screen, setScreen, theme } = useWidget();

  return (
    <View style={[styles.footer, { borderTopColor: theme.border }]}>
      {TABS.map((tab) => {
        const isActive = screen === tab.key;
        const color = isActive ? theme.accent : theme.mutedForeground;

        return (
          <Pressable
            accessibilityRole="button"
            key={tab.key}
            onPress={() => setScreen(tab.key)}
            style={styles.tab}
          >
            <View
              style={[
                styles.indicator,
                { backgroundColor: isActive ? theme.accent : "transparent" },
              ]}
            />
            <Text style={[styles.glyph, { color }]}>{tab.glyph}</Text>
            <Text style={[styles.label, { color }]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
  },
  tab: {
    alignItems: "center",
    flex: 1,
    gap: 2,
    paddingBottom: 10,
    paddingTop: 10,
  },
  indicator: {
    height: 2,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  glyph: {
    fontSize: 18,
  },
  label: {
    fontSize: 11,
    fontWeight: "500",
  },
});
