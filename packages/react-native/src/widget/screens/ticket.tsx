import { useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useMutation, useQuery } from "convex/react";

import * as api from "../api";
import { TICKET_STATUS_LABELS } from "../constants";
import { useWidget } from "../context";
import { WidgetHeader } from "../ui/header";
import { relativeTime } from "../ui/time";

export function TicketScreen() {
  const { contactSessionId, setScreen, theme, ticketId } = useWidget();

  const ticket = useQuery(
    api.getTicket,
    ticketId && contactSessionId
      ? { ticketId, contactSessionId }
      : "skip",
  );

  const addMessage = useMutation(api.addTicketMessage);
  const [body, setBody] = useState("");
  const [isSending, setIsSending] = useState(false);

  const isClosed = ticket?.status === "closed";
  const canSend = Boolean(body.trim()) && !isSending;

  const send = async () => {
    if (!ticketId || !contactSessionId || !canSend) {
      return;
    }

    setIsSending(true);

    try {
      await addMessage({ ticketId, contactSessionId, body: body.trim() });
      setBody("");
    } catch {
      // Left in the box so the reply isn't lost - the person can try again
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <WidgetHeader onBack={() => setScreen("tickets")}>
        <Text
          numberOfLines={1}
          style={[styles.heading, { color: theme.accentForeground }]}
        >
          {ticket ? `#${ticket.number} · ${ticket.subject}` : "Ticket"}
        </Text>
        {ticket ? (
          <Text style={[styles.status, { color: theme.accentForeground }]}>
            {TICKET_STATUS_LABELS[ticket.status]}
          </Text>
        ) : null}
      </WidgetHeader>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <FlatList
          contentContainerStyle={styles.list}
          data={ticket?.messages ?? []}
          keyExtractor={(message) => message._id}
          renderItem={({ item }) => {
            const isCustomer = item.authorType === "customer";

            return (
              <View style={isCustomer ? styles.fromMe : styles.fromThem}>
                <View
                  style={[
                    styles.bubble,
                    {
                      backgroundColor: isCustomer ? theme.accent : theme.muted,
                      borderRadius: theme.radius,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.bubbleText,
                      {
                        color: isCustomer
                          ? theme.accentForeground
                          : theme.foreground,
                      },
                    ]}
                  >
                    {item.body}
                  </Text>
                </View>
                <Text style={[styles.meta, { color: theme.mutedForeground }]}>
                  {item.authorName} · {relativeTime(item._creationTime)}
                </Text>
              </View>
            );
          }}
        />

        <View style={[styles.composer, { borderTopColor: theme.border }]}>
          {isClosed ? (
            <Text style={[styles.closed, { color: theme.mutedForeground }]}>
              This ticket is closed
            </Text>
          ) : (
            <View style={styles.composerRow}>
              <TextInput
                multiline
                onChangeText={setBody}
                placeholder="Write a reply..."
                placeholderTextColor={theme.mutedForeground}
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.background,
                    borderColor: theme.border,
                    borderRadius: theme.radius - 4,
                    color: theme.foreground,
                  },
                ]}
                value={body}
              />
              <Pressable
                accessibilityLabel="Send"
                accessibilityRole="button"
                disabled={!canSend}
                onPress={() => {
                  void send();
                }}
                style={[
                  styles.send,
                  {
                    backgroundColor: theme.accent,
                    borderRadius: theme.radius - 4,
                    opacity: canSend ? 1 : 0.4,
                  },
                ]}
              >
                <Text
                  style={[styles.sendGlyph, { color: theme.accentForeground }]}
                >
                  ↑
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  heading: {
    fontSize: 14,
    fontWeight: "600",
  },
  status: {
    fontSize: 11,
    opacity: 0.75,
  },
  list: {
    gap: 12,
    padding: 16,
  },
  fromMe: {
    alignItems: "flex-end",
    gap: 4,
  },
  fromThem: {
    alignItems: "flex-start",
    gap: 4,
  },
  bubble: {
    maxWidth: "85%",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 19,
  },
  meta: {
    fontSize: 10,
  },
  composer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: 12,
  },
  composerRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 8,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    fontSize: 14,
    maxHeight: 120,
    minHeight: 42,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  send: {
    alignItems: "center",
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  sendGlyph: {
    fontSize: 18,
    fontWeight: "700",
  },
  closed: {
    fontSize: 12,
    textAlign: "center",
  },
});
