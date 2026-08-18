import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useMutation } from "convex/react";

import * as api from "../api";
import { useWidget } from "../context";
import { WidgetFooter } from "../ui/footer";
import { WidgetGreeting, WidgetHeader } from "../ui/header";
import { CardButton } from "../ui/primitives";

function MenuRow({
  glyph,
  hint,
  onPress,
  pending,
  title,
}: {
  glyph: string;
  hint: string;
  onPress: () => void;
  pending?: boolean;
  title: string;
}) {
  const { theme } = useWidget();

  return (
    <CardButton disabled={pending} onPress={onPress}>
      <View style={styles.row}>
        <View style={[styles.badge, { backgroundColor: theme.muted }]}>
          <Text style={styles.badgeGlyph}>{glyph}</Text>
        </View>
        <View style={styles.rowText}>
          <Text style={[styles.rowTitle, { color: theme.foreground }]}>
            {title}
          </Text>
          <Text style={[styles.rowHint, { color: theme.mutedForeground }]}>
            {hint}
          </Text>
        </View>
        <Text style={[styles.chevron, { color: theme.mutedForeground }]}>›</Text>
      </View>
    </CardButton>
  );
}

export function SelectionScreen() {
  const {
    contactSessionId,
    organizationId,
    setConversationId,
    setErrorMessage,
    setScreen,
    widgetSettings,
  } = useWidget();

  const createConversation = useMutation(api.createConversation);
  const [isPending, setIsPending] = useState(false);

  const startChat = async () => {
    if (!contactSessionId) {
      setScreen("auth");
      return;
    }

    setIsPending(true);

    try {
      const conversationId = await createConversation({
        contactSessionId,
        organizationId,
      });

      setConversationId(conversationId);
      setScreen("chat");
    } catch {
      // Almost always an expired session, which signing in again fixes
      setErrorMessage(null);
      setScreen("auth");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <>
      <WidgetHeader>
        <WidgetGreeting logoUrl={widgetSettings?.logoUrl} />
      </WidgetHeader>
      <View style={styles.body}>
        <MenuRow
          glyph="💬"
          hint={isPending ? "Setting things up…" : "Typically replies in a few minutes"}
          onPress={() => {
            void startChat();
          }}
          pending={isPending}
          title="Start chat"
        />
        <MenuRow
          glyph="🎫"
          hint="For issues that need tracking"
          onPress={() => setScreen("tickets")}
          pending={isPending}
          title="Submit a ticket"
        />
      </View>
      <WidgetFooter />
    </>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    gap: 12,
    padding: 16,
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  badge: {
    alignItems: "center",
    borderRadius: 10,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  badgeGlyph: {
    fontSize: 18,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  rowHint: {
    fontSize: 12,
  },
  chevron: {
    fontSize: 22,
  },
});
