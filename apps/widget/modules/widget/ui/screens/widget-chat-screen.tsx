"use client";

import { AISuggestion, AISuggestions } from "@workspace/ui/components/ai/suggestion";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { useThreadMessages, toUIMessages } from "@convex-dev/agent/react";
import { WidgetHeader } from "@/modules/widget/ui/components/widget-header";
import { Button } from "@workspace/ui/components/button";
import { useAtomValue, useSetAtom } from "jotai";
import { ArrowLeftIcon, ImagePlusIcon, Loader2Icon, MenuIcon, XIcon } from "lucide-react";
import { DicebearAvatar } from "@workspace/ui/components/dicebear-avatar";
import { useInfiniteScroll } from "@workspace/ui/hooks/use-infinite-scroll";
import {
  useCountIncrease,
  useNotificationSound,
} from "@workspace/ui/hooks/use-notification-sound";
import { InfiniteScrollTrigger } from "@workspace/ui/components/infinite-scroll-trigger";
import { contactSessionIdAtomFamily, conversationIdAtom, organizationIdAtom, screenAtom, widgetSettingsAtom } from "../../atoms/widget-atoms";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { Form, FormField } from "@workspace/ui/components/form";
import {
  AIConversation,
  AIConversationContent,
  AIConversationScrollButton,
} from "@workspace/ui/components/ai/conversation";
import {
  AIInput,
  AIInputSubmit,
  AIInputTextarea,
  AIInputToolbar,
  AIInputTools,
} from "@workspace/ui/components/ai/input";
import {
  AIMessage,
  AIMessageContent,
} from "@workspace/ui/components/ai/message";
import { AIResponse } from "@workspace/ui/components/ai/response";
import { useMemo, useRef, useState } from "react";
import { Id } from "@workspace/backend/_generated/dataModel";

const formSchema = z.object({
  message: z.string(),
});

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

export const WidgetChatScreen = () => {
  const setScreen = useSetAtom(screenAtom);
  const setConversationId = useSetAtom(conversationIdAtom);

  const widgetSettings = useAtomValue(widgetSettingsAtom);
  const conversationId = useAtomValue(conversationIdAtom);
  const organizationId = useAtomValue(organizationIdAtom);
  const contactSessionId = useAtomValue(
    contactSessionIdAtomFamily(organizationId || "")
  );

  const onBack = () => {
    setConversationId(null);
    setScreen("selection");
  };

  const suggestions = useMemo(() => {
    if (!widgetSettings) {
      return [];
    }

    return Object.keys(widgetSettings.defaultSuggestions).map((key) => {
      return widgetSettings.defaultSuggestions[
        key as keyof typeof widgetSettings.defaultSuggestions
      ];
    });
  }, [widgetSettings]);

  const conversation = useQuery(
    api.public.conversations.getOne,
    conversationId && contactSessionId
      ? {
          conversationId,
          contactSessionId,
        } 
      : "skip"
  );

  const messages = useThreadMessages(
    api.public.messages.getMany,
    conversation?.threadId && contactSessionId
      ? {
          threadId: conversation.threadId,
          contactSessionId,
        }
      : "skip",
    { initialNumItems: 10 },
  );

  const { topElementRef, handleLoadMore, canLoadMore, isLoadingMore } = useInfiniteScroll({
    status: messages.status,
    loadMore: messages.loadMore,
    loadSize: 10,
  });

  // Chime when the assistant or a human operator answers
  const { play } = useNotificationSound();
  useCountIncrease(
    messages.results?.filter((message) => message.message?.role !== "user")
      .length,
    () => play("incoming"),
  );

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      message: "",
    },
  });

  const createMessage = useMutation(api.public.messages.create);
  const generateUploadUrl = useMutation(api.public.messages.generateUploadUrl);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachment, setAttachment] = useState<{
    storageId: Id<"_storage">;
    previewUrl: string;
    name: string;
  } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const isResolved = conversation?.status === "resolved";

  const handleImageSelected = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    // Allows re-picking the same file after an error
    event.target.value = "";

    if (!file || !contactSessionId) {
      return;
    }

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setUploadError("Only PNG, JPG, WEBP or GIF images");
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      setUploadError("Image must be smaller than 5MB");
      return;
    }

    setUploadError(null);
    setIsUploading(true);

    try {
      const uploadUrl = await generateUploadUrl({ contactSessionId });

      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!result.ok) {
        throw new Error(`Upload failed with status ${result.status}`);
      }

      const { storageId } = (await result.json()) as {
        storageId: Id<"_storage">;
      };

      setAttachment({
        storageId,
        previewUrl: URL.createObjectURL(file),
        name: file.name,
      });
    } catch (error) {
      console.error(error);
      setUploadError("Could not upload image");
    } finally {
      setIsUploading(false);
    }
  };

  const clearAttachment = () => {
    if (attachment) {
      URL.revokeObjectURL(attachment.previewUrl);
    }

    setAttachment(null);
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!conversation || !contactSessionId) {
      return;
    }

    // Either text or an image is enough to send
    if (!values.message.trim() && !attachment) {
      return;
    }

    const imageStorageId = attachment?.storageId;

    form.reset();
    clearAttachment();
    play("outgoing");

    await createMessage({
      threadId: conversation.threadId,
      prompt: values.message,
      contactSessionId,
      imageStorageId,
    });
  };

  return (
    <>
      <WidgetHeader className="flex items-center justify-between">
        <div className="flex items-center gap-x-2">
          <Button
            onClick={onBack}
            size="icon"
            variant="transparent"
          >
            <ArrowLeftIcon />
          </Button>
          <p>Chat</p>
        </div>
        <Button
          size="icon"
          variant="transparent"
        >
          <MenuIcon />
        </Button>
      </WidgetHeader>
      <AIConversation>
        <AIConversationContent>
          <InfiniteScrollTrigger
            canLoadMore={canLoadMore}
            isLoadingMore={isLoadingMore}
            onLoadMore={handleLoadMore}
            ref={topElementRef}
          />
          {toUIMessages(messages.results ?? [])?.map((message) => {
            return (
              <AIMessage
                from={message.role === "user" ? "user" : "assistant"}
                key={message.id}
              >
                <AIMessageContent>
                  <AIResponse>{message.content}</AIResponse>
                </AIMessageContent>
                {message.role === "assistant" && (
                  <DicebearAvatar
                    imageUrl="/logo.svg"
                    seed="assistant"
                    size={32}
                  />
                )}
              </AIMessage>
            )
          })}
        </AIConversationContent>
      </AIConversation>
      {toUIMessages(messages.results ?? [])?.length === 1 && (
        <AISuggestions className="flex w-full flex-col items-end p-2">
          {suggestions.map((suggestion) => {
            if (!suggestion) {
              return null;
            }

            return (
              <AISuggestion
                key={suggestion}
                onClick={() => {
                  form.setValue("message", suggestion, {
                    shouldValidate: true,
                    shouldDirty: true,
                    shouldTouch: true,
                  });
                  form.handleSubmit(onSubmit)();
                }}
                suggestion={suggestion}
              />
            )
          })}
        </AISuggestions>
      )}
      <Form {...form}>
          <AIInput
            className="rounded-none border-x-0 border-b-0"
            onSubmit={form.handleSubmit(onSubmit)}
          >
            {(attachment || isUploading || uploadError) && (
              <div className="flex items-center gap-x-2 px-3 pt-3">
                {attachment && (
                  <div className="relative">
                    {/* Local object URL preview */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      alt={attachment.name}
                      className="size-14 rounded-lg border object-cover"
                      src={attachment.previewUrl}
                    />
                    <button
                      aria-label="Remove image"
                      className="-right-1.5 -top-1.5 absolute flex size-5 items-center justify-center rounded-full bg-foreground text-background shadow-sm"
                      onClick={clearAttachment}
                      type="button"
                    >
                      <XIcon className="size-3" />
                    </button>
                  </div>
                )}

                {isUploading && (
                  <span className="flex items-center gap-x-2 text-muted-foreground text-xs">
                    <Loader2Icon className="size-3 animate-spin" />
                    Uploading…
                  </span>
                )}

                {uploadError && (
                  <span className="text-destructive text-xs">{uploadError}</span>
                )}
              </div>
            )}

            <FormField
              control={form.control}
              disabled={isResolved}
              name="message"
              render={({ field }) => (
                <AIInputTextarea
                  disabled={isResolved}
                  onChange={field.onChange}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      form.handleSubmit(onSubmit)();
                    }
                  }}
                  placeholder={
                    isResolved
                      ? "This conversation has been resolved."
                      : "Type your message..."
                  }
                  value={field.value}
                />
              )}
            />
            <AIInputToolbar>
              <AIInputTools>
                <Button
                  aria-label="Attach image"
                  className="size-9 shrink-0 text-muted-foreground"
                  disabled={isResolved || isUploading}
                  onClick={() => fileInputRef.current?.click()}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  {isUploading ? (
                    <Loader2Icon className="animate-spin" />
                  ) : (
                    <ImagePlusIcon />
                  )}
                </Button>
                <input
                  accept={ACCEPTED_IMAGE_TYPES.join(",")}
                  className="hidden"
                  onChange={handleImageSelected}
                  ref={fileInputRef}
                  type="file"
                />
              </AIInputTools>
              <AIInputSubmit
                disabled={
                  isResolved ||
                  isUploading ||
                  (!form.watch("message").trim() && !attachment)
                }
                status="ready"
                type="submit"
              />
            </AIInputToolbar>
          </AIInput>
      </Form>
    </>
  );
};
