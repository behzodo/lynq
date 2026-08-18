import { StyleSheet, View } from "react-native";

import { useWidget } from "./context";
import { AuthScreen } from "./screens/auth";
import { ChatScreen } from "./screens/chat";
import { ErrorScreen } from "./screens/error";
import { InboxScreen } from "./screens/inbox";
import { LoadingScreen } from "./screens/loading";
import { SelectionScreen } from "./screens/selection";
import { TicketFormScreen } from "./screens/ticket-form";
import { TicketScreen } from "./screens/ticket";
import { TicketsScreen } from "./screens/tickets";

/**
 * The screen machine. One atom of state decides what is on screen, exactly as
 * the web widget does - there is no navigator here, and adding one would put a
 * second router inside the host app's.
 */
export function WidgetView() {
  const { screen, theme } = useWidget();

  const screens = {
    loading: <LoadingScreen />,
    error: <ErrorScreen />,
    auth: <AuthScreen />,
    selection: <SelectionScreen />,
    inbox: <InboxScreen />,
    chat: <ChatScreen />,
    tickets: <TicketsScreen />,
    "ticket-form": <TicketFormScreen />,
    ticket: <TicketScreen />,
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      {screens[screen]}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: "hidden",
  },
});
