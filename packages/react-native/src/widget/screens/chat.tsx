import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";

import * as api from "../api";
import { PAGE_SIZE } from "../constants";
import { useWidget } from "../context";
import { WidgetHeader } from "../ui/header";
import { CenteredNotice } from "../ui/primitives";

/** Attachments ride along as markdown, which is what the web widget sends. */
const IMAGE_MARKDOWN = /!\[[^\]]*\]\(([^)]+)\)/;

function splitAttachment(text: string): { imageUrl?: string; body: string } {
  const match = IMAGE_MARKDOWN.exec(text);

  if (!match?.[1]) {
    return { body: text };
  }

  return {
    imageUrl: match[1],
    body: text.replace(match[0], "").trim(),
  };
}

export function ChatScreen() {
  const {
    contactSessionId,
    conversationId,
    pickImage,
    setConversationId,
    setScreen,
    theme,
    widgetSettings,
  } = useWidget();

  const conversation = useQuery(
    api.getConversation,
    conversationId && contactSessionId
      ? { conversationId, contactSessionId }
      : "skip",
  );

  const messages = usePaginatedQuery(
    api.getMessages,
    conversation?.threadId && contactSessionId
      ? { threadId: conversation.threadId, contactSessionId }
      : "skip",
    { initialNumItems: PAGE_SIZE },
  );

  const createMessage = useMutation(api.createMessage);
  const generateUploadUrl = useMutation(api.generateUploadUrl);

  const [draft, setDraft] = useState("");
  const [attachment, setAttachment] = useState<{
    storageId: string;
    previewUri: string;
  } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const isResolved = conversation?.status === "resolved";
  const canSend =
    !isResolved && !isUploading && Boolean(draft.trim() || attachment);

  const suggestions = useMemo(() => {
    const defaults = widgetSettings?.defaultSuggestions;

    if (!defaults) {
      return [];
    }

    return [
      defaults.suggestion1,
      defaults.suggestion2,
      defaults.suggestion3,
    ].filter((suggestion): suggestion is string => Boolean(suggestion));
  }, [widgetSettings]);

  const attach = async () => {
    if (!pickImage || !contactSessionId) {
      return;
    }

    setUploadError(null);

    try {
      const asset = await pickImage();

      if (!asset) {
        return;
      }

      setIsUploading(true);

      const uploadUrl = await generateUploadUrl({ contactSessionId });
      // A local file:// or content:// uri has to be read before it can be
      // posted; fetch handles both on iOS and Android.
      const file = await (await fetch(asset.uri)).blob();

      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": asset.mimeType ?? "image/jpeg" },
        body: file,
      });

      if (!result.ok) {
        throw new Error(`Upload failed with status ${result.status}`);
      }

      const { storageId } = (await result.json()) as { storageId: string };

      setAttachment({ storageId, previewUri: asset.uri });
    } catch {
      setUploadError("Could not upload image");
    } finally {
      setIsUploading(false);
    }
  };

  const send = async (text?: string) => {
    const prompt = (text ?? draft).trim();

    if (!conversation || !contactSessionId) {
      return;
    }

    if (!prompt && !attachment) {
      return;
    }

    const imageStorageId = attachment?.storageId;

    setDraft("");
    setAttachment(null);

    try {
      await createMessage({
        threadId: conversation.threadId,
        prompt,
        contactSessionId,
        imageStorageId,
      });
    } catch {
      // Put it back rather than losing what they typed
      setDraft(prompt);
    }
  };

  const showSuggestions = suggestions.length > 0 && messages.results.length <= 1;

  return (
    <>
      <WidgetHeader
        onBack={() => {
          setConversationId(null);
          setScreen("selection");
        }}
      >
        <Text style={[styles.heading, { color: theme.accentForeground }]}>
          Chat
        </Text>
      </WidgetHeader>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <FlatList
          contentContainerStyle={styles.list}
          data={messages.results}
          // The server pages this thread newest-first, so inverting puts the
          // newest at the bottom without sorting anything. The web widget
          // re-sorts ascending instead, because it renders top-down.
          inverted
          keyExtractor={(message) => message._id}
          ListEmptyComponent={
            messages.status === "LoadingFirstPage" ? null : (
              <CenteredNotice message="Say hello to start the conversation" />
            )
          }
          ListFooterComponent={
            messages.isLoading ? (
              <ActivityIndicator
                color={theme.mutedForeground}
                style={styles.more}
              />
            ) : null
          }
          // Inverted, so "end" is the top of the thread: older messages
          onEndReached={() => {
            if (messages.status === "CanLoadMore") {
              messages.loadMore(PAGE_SIZE);
            }
          }}
          onEndReachedThreshold={0.4}
          renderItem={({ item }) => {
            const isMine = item.message?.role === "user";
            const { body, imageUrl } = splitAttachment(item.text ?? "");

            return (
              <View style={isMine ? styles.fromMe : styles.fromThem}>
                <View
                  style={[
                    styles.bubble,
                    {
                      backgroundColor: isMine ? theme.accent : theme.muted,
                      borderRadius: theme.radius,
                    },
                  ]}
                >
                  {imageUrl ? (
                    <Image
                      source={{ uri: imageUrl }}
                      style={[styles.attachment, { borderRadius: theme.radius - 4 }]}
                    />
                  ) : null}
                  {body ? (
                    <Text
                      style={[
                        styles.bubbleText,
                        {
                          color: isMine
                            ? theme.accentForeground
                            : theme.foreground,
                        },
                      ]}
                    >
                      {body}
                    </Text>
                  ) : null}
                </View>
              </View>
            );
          }}
        />

        {showSuggestions ? (
          <View style={styles.suggestions}>
            {suggestions.map((suggestion) => (
              <Pressable
                accessibilityRole="button"
                key={suggestion}
                onPress={() => {
                  void send(suggestion);
                }}
                style={[
                  styles.suggestion,
                  { borderColor: theme.border, borderRadius: theme.radius },
                ]}
              >
                <Text
                  style={[styles.suggestionText, { color: theme.foreground }]}
                >
                  {suggestion}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <View style={[styles.composer, { borderTopColor: theme.border }]}>
          {attachment || isUploading || uploadError ? (
            <View style={styles.attachmentRow}>
              {attachment ? (
                <View>
                  <Image
                    source={{ uri: attachment.previewUri }}
                    style={[styles.preview, { borderColor: theme.border }]}
                  />
                  <Pressable
                    accessibilityLabel="Remove image"
                    accessibilityRole="button"
                    hitSlop={8}
                    onPress={() => setAttachment(null)}
                    style={[
                      styles.removeAttachment,
                      { backgroundColor: theme.foreground },
                    ]}
                  >
                    <Text
                      style={[
                        styles.removeGlyph,
                        { color: theme.background },
                      ]}
                    >
                      ✕
                    </Text>
                  </Pressable>
                </View>
              ) : null}

              {isUploading ? (
                <ActivityIndicator color={theme.mutedForeground} size="small" />
              ) : null}

              {uploadError ? (
                <Text style={[styles.uploadError, { color: theme.destructive }]}>
                  {uploadError}
                </Text>
              ) : null}
            </View>
          ) : null}

          <View style={styles.composerRow}>
            {pickImage ? (
              <Pressable
                accessibilityLabel="Attach image"
                accessibilityRole="button"
                disabled={isResolved || isUploading}
                onPress={() => {
                  void attach();
                }}
                style={styles.attachButton}
              >
                <Text
                  style={[styles.attachGlyph, { color: theme.mutedForeground }]}
                >
                  ＋
                </Text>
              </Pressable>
            ) : null}

            <TextInput
              editable={!isResolved}
              multiline
              onChangeText={setDraft}
              placeholder={
                isResolved
                  ? "This conversation has been resolved."
                  : "Type your message..."
              }
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
              value={draft}
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
              <Text style={[styles.sendGlyph, { color: theme.accentForeground }]}>
                ↑
              </Text>
            </Pressable>
          </View>
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
    fontSize: 16,
    fontWeight: "600",
  },
  list: {
    gap: 10,
    padding: 16,
  },
  fromMe: {
    alignItems: "flex-end",
  },
  fromThem: {
    alignItems: "flex-start",
  },
  bubble: {
    gap: 8,
    maxWidth: "85%",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 19,
  },
  attachment: {
    height: 160,
    width: 200,
  },
  more: {
    paddingVertical: 12,
  },
  suggestions: {
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  suggestion: {
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  suggestionText: {
    fontSize: 13,
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
  attachmentRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    paddingBottom: 10,
  },
  preview: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    height: 56,
    width: 56,
  },
  removeAttachment: {
    alignItems: "center",
    borderRadius: 999,
    height: 20,
    justifyContent: "center",
    position: "absolute",
    right: -6,
    top: -6,
    width: 20,
  },
  removeGlyph: {
    fontSize: 10,
  },
  uploadError: {
    fontSize: 12,
  },
  attachButton: {
    alignItems: "center",
    height: 42,
    justifyContent: "center",
    width: 32,
  },
  attachGlyph: {
    fontSize: 20,
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
});
