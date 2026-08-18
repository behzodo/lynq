import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { usePaginatedQuery } from "convex/react";

import * as api from "../api";
import { PAGE_SIZE } from "../constants";
import { useWidget } from "../context";
import { WidgetFooter } from "../ui/footer";
import { WidgetHeader } from "../ui/header";
import { CardButton, CenteredNotice } from "../ui/primitives";
import { relativeTime } from "../ui/time";

const STATUS_GLYPH: Record<api.ConversationStatus, string> = {
  unresolved: "●",
  escalated: "▲",
  resolved: "✓",
};

export function InboxScreen() {
  const { contactSessionId, setConversationId, setScreen, theme } = useWidget();

  const conversations = usePaginatedQuery(
    api.getConversations,
    contactSessionId ? { contactSessionId } : "skip",
    { initialNumItems: PAGE_SIZE },
  );

  const isLoading = conversations.status === "LoadingFirstPage";

  return (
    <>
      <WidgetHeader onBack={() => setScreen("selection")}>
        <Text style={[styles.heading, { color: theme.accentForeground }]}>
          Inbox
        </Text>
      </WidgetHeader>

      <FlatList
        contentContainerStyle={styles.list}
        data={conversations.results}
        keyExtractor={(conversation) => conversation._id}
        ListEmptyComponent={
          isLoading ? null : (
            <CenteredNotice glyph="✉" message="No conversations yet" />
          )
        }
        ListFooterComponent={
          conversations.isLoading && !isLoading ? (
            <ActivityIndicator color={theme.mutedForeground} style={styles.more} />
          ) : null
        }
        // Paging on scroll, which is the native stand-in for the web widget's
        // intersection-observer trigger
        onEndReached={() => {
          if (conversations.status === "CanLoadMore") {
            conversations.loadMore(PAGE_SIZE);
          }
        }}
        onEndReachedThreshold={0.4}
        renderItem={({ item }) => (
          <CardButton
            onPress={() => {
              setConversationId(item._id);
              setScreen("chat");
            }}
          >
            <View style={styles.rowTop}>
              <Text style={[styles.meta, { color: theme.mutedForeground }]}>
                Chat
              </Text>
              <Text style={[styles.meta, { color: theme.mutedForeground }]}>
                {relativeTime(item._creationTime)}
              </Text>
            </View>
            <View style={styles.rowBottom}>
              <Text
                numberOfLines={1}
                style={[styles.preview, { color: theme.foreground }]}
              >
                {item.lastMessage?.text || "No messages yet"}
              </Text>
              <Text style={[styles.status, { color: theme.mutedForeground }]}>
                {STATUS_GLYPH[item.status]}
              </Text>
            </View>
          </CardButton>
        )}
      />

      {isLoading ? (
        <ActivityIndicator color={theme.mutedForeground} style={styles.more} />
      ) : null}

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
  preview: {
    flex: 1,
    fontSize: 14,
  },
  status: {
    fontSize: 12,
  },
  more: {
    paddingVertical: 12,
  },
});
