import { FlatList, StyleSheet, Text, View } from "react-native";
import { useQuery } from "convex/react";

import * as api from "../api";
import { TICKET_STATUS_LABELS } from "../constants";
import { useWidget } from "../context";
import { WidgetFooter } from "../ui/footer";
import { WidgetHeader } from "../ui/header";
import { CardButton, CenteredNotice, PrimaryButton } from "../ui/primitives";
import { relativeTime } from "../ui/time";

export function TicketsScreen() {
  const { contactSessionId, setScreen, setTicketId, theme } = useWidget();

  const tickets = useQuery(
    api.getTickets,
    contactSessionId ? { contactSessionId } : "skip",
  );

  return (
    <>
      <WidgetHeader onBack={() => setScreen("selection")}>
        <Text style={[styles.heading, { color: theme.accentForeground }]}>
          My tickets
        </Text>
      </WidgetHeader>

      <FlatList
        contentContainerStyle={styles.list}
        data={tickets ?? []}
        keyExtractor={(ticket) => ticket._id}
        ListEmptyComponent={
          tickets === undefined ? null : (
            <CenteredNotice glyph="🎫" message="No tickets yet" />
          )
        }
        ListHeaderComponent={
          <PrimaryButton
            label="New ticket"
            onPress={() => setScreen("ticket-form")}
          />
        }
        renderItem={({ item }) => (
          <CardButton
            onPress={() => {
              setTicketId(item._id);
              setScreen("ticket");
            }}
          >
            <View style={styles.rowTop}>
              <Text style={[styles.meta, { color: theme.mutedForeground }]}>
                #{item.number}
              </Text>
              <Text style={[styles.meta, { color: theme.mutedForeground }]}>
                {relativeTime(item.lastMessageAt)}
              </Text>
            </View>
            <View style={styles.rowBottom}>
              <Text
                numberOfLines={1}
                style={[styles.subject, { color: theme.foreground }]}
              >
                {item.subject}
              </Text>
              <View style={[styles.badge, { backgroundColor: theme.muted }]}>
                <Text
                  style={[styles.badgeText, { color: theme.mutedForeground }]}
                >
                  {TICKET_STATUS_LABELS[item.status]}
                </Text>
              </View>
            </View>
          </CardButton>
        )}
      />

      <WidgetFooter />
    </>
  );
}

const styles = StyleSheet.create({
  heading: {
    fontSize: 16,
    fontWeight: "600",
  },
  list: {
    flexGrow: 1,
    gap: 10,
    padding: 16,
  },
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  rowBottom: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
  },
  meta: {
    fontSize: 11,
  },
  subject: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "500",
  },
});
