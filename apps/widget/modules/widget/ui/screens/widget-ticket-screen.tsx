"use client";

import { useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeftIcon, SendIcon } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { Button } from "@workspace/ui/components/button";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  useCountIncrease,
  useNotificationSound,
} from "@workspace/ui/hooks/use-notification-sound";
import { cn } from "@workspace/ui/lib/utils";
import { WidgetHeader } from "@/modules/widget/ui/components/widget-header";
import { TICKET_STATUS_LABELS } from "@/modules/widget/constants";
import {
  contactSessionIdAtomFamily,
  organizationIdAtom,
  screenAtom,
  ticketIdAtom,
} from "@/modules/widget/atoms/widget-atoms";

export const WidgetTicketScreen = () => {
  const setScreen = useSetAtom(screenAtom);
  const ticketId = useAtomValue(ticketIdAtom);

  const organizationId = useAtomValue(organizationIdAtom);
  const contactSessionId = useAtomValue(
    contactSessionIdAtomFamily(organizationId || ""),
  );

  const ticket = useQuery(
    api.public.tickets.getOne,
    ticketId && contactSessionId ? { ticketId, contactSessionId } : "skip",
  );

  const addMessage = useMutation(api.public.tickets.addMessage);
  const [body, setBody] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Chime when the support agent answers
  const { play } = useNotificationSound();
  useCountIncrease(
    ticket?.messages.filter((message) => message.authorType === "agent").length,
    () => play("incoming"),
  );

  const isClosed = ticket?.status === "closed";

  const onSend = async () => {
    if (!ticketId || !contactSessionId || !body.trim()) {
      return;
    }

    setIsSending(true);
    try {
      await addMessage({ ticketId, contactSessionId, body: body.trim() });
      setBody("");
      play("outgoing");
    } catch (error) {
      console.error(error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <WidgetHeader>
        <div className="flex items-center gap-x-2">
          <Button
            variant="transparent"
            size="icon"
            onClick={() => setScreen("tickets")}
          >
            <ArrowLeftIcon />
          </Button>
          <div className="flex flex-col">
            <p className="text-sm font-medium">
              {ticket ? `#${ticket.number} · ${ticket.subject}` : "Ticket"}
            </p>
            {ticket && (
              <p className="text-xs text-primary-foreground/70">
                {TICKET_STATUS_LABELS[ticket.status]}
              </p>
            )}
          </div>
        </div>
      </WidgetHeader>

      <div className="flex flex-1 flex-col gap-y-3 overflow-y-auto bg-background p-4">
        {ticket?.messages.map((message) => (
          <div
            key={message._id}
            className={cn(
              "flex flex-col gap-y-1",
              message.authorType === "customer" ? "items-end" : "items-start",
            )}
          >
            <div
              className={cn(
                "max-w-[85%] whitespace-pre-wrap rounded-xl px-3 py-2 text-sm",
                message.authorType === "customer"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted",
              )}
            >
              {message.body}
            </div>
            <p className="text-[10px] text-muted-foreground">
              {message.authorName} ·{" "}
              {formatDistanceToNow(new Date(message._creationTime), {
                addSuffix: true,
              })}
            </p>
          </div>
        ))}
      </div>

      <div className="border-t bg-background p-3">
        {isClosed ? (
          <p className="text-center text-xs text-muted-foreground">
            This ticket is closed
          </p>
        ) : (
          <div className="flex items-end gap-x-2">
            <Textarea
              className="min-h-10 resize-none"
              onChange={(event) => setBody(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  onSend();
                }
              }}
              placeholder="Write a reply..."
              rows={1}
              value={body}
            />
            <Button
              disabled={isSending || !body.trim()}
              onClick={onSend}
              size="icon"
            >
              <SendIcon className="size-4" />
            </Button>
          </div>
        )}
      </div>
    </>
  );
};
