"use client";

import { useAtomValue, useSetAtom } from "jotai";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeftIcon, PlusIcon, TicketIcon } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { Button } from "@workspace/ui/components/button";
import { WidgetHeader } from "@/modules/widget/ui/components/widget-header";
import { WidgetFooter } from "../components/widget-footer";
import { TICKET_STATUS_LABELS } from "@/modules/widget/constants";
import {
  contactSessionIdAtomFamily,
  organizationIdAtom,
  screenAtom,
  ticketIdAtom,
} from "@/modules/widget/atoms/widget-atoms";

export const WidgetTicketsScreen = () => {
  const setScreen = useSetAtom(screenAtom);
  const setTicketId = useSetAtom(ticketIdAtom);

  const organizationId = useAtomValue(organizationIdAtom);
  const contactSessionId = useAtomValue(
    contactSessionIdAtomFamily(organizationId || ""),
  );

  const tickets = useQuery(
    api.public.tickets.getMany,
    contactSessionId ? { contactSessionId } : "skip",
  );

  return (
    <>
      <WidgetHeader>
        <div className="flex items-center gap-x-2">
          <Button
            variant="transparent"
            size="icon"
            onClick={() => setScreen("selection")}
          >
            <ArrowLeftIcon />
          </Button>
          <p>My tickets</p>
        </div>
      </WidgetHeader>

      <div className="flex flex-1 flex-col gap-y-2 overflow-y-auto p-4">
        <Button
          className="w-full"
          onClick={() => setScreen("ticket-form")}
          variant="outline"
        >
          <PlusIcon className="size-4" />
          New ticket
        </Button>

        {tickets?.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center gap-y-2 text-muted-foreground">
            <TicketIcon className="size-8" />
            <p className="text-sm">No tickets yet</p>
          </div>
        )}

        {tickets?.map((ticket) => (
          <Button
            className="h-auto w-full justify-between py-3"
            key={ticket._id}
            onClick={() => {
              setTicketId(ticket._id);
              setScreen("ticket");
            }}
            variant="outline"
          >
            <div className="flex w-full flex-col gap-y-2 overflow-hidden text-start">
              <div className="flex w-full items-center justify-between gap-x-2">
                <p className="text-xs text-muted-foreground">
                  #{ticket.number}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(ticket.lastMessageAt), {
                    addSuffix: true,
                  })}
                </p>
              </div>
              <div className="flex w-full items-center justify-between gap-x-2">
                <p className="truncate text-sm font-medium">{ticket.subject}</p>
                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {TICKET_STATUS_LABELS[ticket.status]}
                </span>
              </div>
            </div>
          </Button>
        ))}
      </div>

      <WidgetFooter />
    </>
  );
};
