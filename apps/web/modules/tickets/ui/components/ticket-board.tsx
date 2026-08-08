"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Loader2Icon, TicketIcon } from "lucide-react";
import { api } from "@workspace/backend/_generated/api";
import { Doc, Id } from "@workspace/backend/_generated/dataModel";
import { Badge } from "@workspace/ui/components/badge";
import { cn } from "@workspace/ui/lib/utils";
import {
  TICKET_CATEGORY_LABELS,
  TICKET_PRIORITY_CLASSES,
  TICKET_STATUSES,
} from "../../constants";

type Ticket = Doc<"tickets">;
type Status = Ticket["status"];

const DRAG_MIME = "application/x-echo-ticket";

// Thin colored rail down the left edge of each card
const PRIORITY_RAIL: Record<Ticket["priority"], string> = {
  low: "bg-muted-foreground/40",
  medium: "bg-foreground",
  high: "bg-amber-500",
  urgent: "bg-destructive",
};

const COLUMN_ACCENT: Record<Status, string> = {
  open: "bg-foreground",
  in_progress: "bg-amber-500",
  waiting: "bg-purple-500",
  resolved: "bg-green-600",
  closed: "bg-muted-foreground",
};

interface CardProps {
  ticket: Ticket;
  onDragStart: (ticketId: Id<"tickets">) => void;
  onDragEnd: () => void;
  isDragging: boolean;
};

const TicketCard = ({
  ticket,
  onDragStart,
  onDragEnd,
  isDragging,
}: CardProps) => (
  <Link href={`/tickets/${ticket._id}`}>
    <div
      className={cn(
        "group relative flex cursor-grab gap-2 overflow-hidden rounded-lg border bg-background p-3 shadow-sm transition-all hover:border-primary/40 hover:shadow-md active:cursor-grabbing",
        isDragging && "opacity-40",
      )}
      draggable
      onDragEnd={onDragEnd}
      onDragStart={(event) => {
        event.dataTransfer.setData(DRAG_MIME, ticket._id);
        event.dataTransfer.effectAllowed = "move";
        onDragStart(ticket._id);
      }}
    >
      <span
        className={cn(
          "absolute inset-y-0 left-0 w-1",
          PRIORITY_RAIL[ticket.priority],
        )}
      />

      <div className="min-w-0 flex-1 space-y-1.5 pl-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium text-muted-foreground text-xs">
            #{ticket.number}
          </span>
          <span
            className={cn(
              "font-semibold text-[10px] uppercase",
              TICKET_PRIORITY_CLASSES[ticket.priority],
            )}
          >
            {ticket.priority}
          </span>
        </div>

        <p className="line-clamp-2 font-medium text-sm leading-snug">
          {ticket.subject}
        </p>

        <p className="line-clamp-1 text-muted-foreground text-xs">
          {ticket.name} {ticket.surname}
        </p>

        <div className="flex items-center justify-between gap-2 pt-0.5">
          <Badge className="text-[10px]" variant="secondary">
            {TICKET_CATEGORY_LABELS[ticket.category]}
          </Badge>
          <span className="shrink-0 text-[10px] text-muted-foreground">
            {formatDistanceToNow(new Date(ticket.lastMessageAt), {
              addSuffix: true,
            })}
          </span>
        </div>

        {ticket.assigneeName && (
          <p className="truncate text-[10px] text-muted-foreground/70">
            {ticket.assigneeName}
          </p>
        )}
      </div>
    </div>
  </Link>
);

export const TicketBoard = () => {
  const board = useQuery(api.private.tickets.getBoard);
  const updateStatus = useMutation(api.private.tickets.updateStatus);

  const [draggingId, setDraggingId] = useState<Id<"tickets"> | null>(null);
  const [dropTarget, setDropTarget] = useState<Status | null>(null);

  if (board === undefined) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2Icon className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  const onDrop = async (status: Status) => {
    const ticketId = draggingId;

    setDropTarget(null);
    setDraggingId(null);

    if (!ticketId) {
      return;
    }

    const ticket = board.tickets.find((item) => item._id === ticketId);

    // Dropping a card back where it started is a no-op
    if (!ticket || ticket.status === status) {
      return;
    }

    try {
      await updateStatus({ ticketId, status });
    } catch (error) {
      console.error(error);
      toast.error("Could not move the ticket");
    }
  };

  return (
    <div className="space-y-3">
      {board.truncated && (
        <p className="text-muted-foreground text-xs">
          Showing the 300 most recent tickets. Use the list view to see older
          ones.
        </p>
      )}

      <div className="flex gap-4 overflow-x-auto pb-4">
        {TICKET_STATUSES.map((column) => {
          const columnTickets = board.tickets.filter(
            (ticket) => ticket.status === column.value,
          );

          return (
            <div
              className={cn(
                "flex w-72 shrink-0 flex-col rounded-xl border bg-background/60 transition-colors",
                dropTarget === column.value &&
                  "border-primary bg-primary/5 ring-2 ring-primary/20",
              )}
              key={column.value}
              onDragLeave={(event) => {
                // Ignore bubbling from children leaving into each other
                if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                  setDropTarget((current) =>
                    current === column.value ? null : current,
                  );
                }
              }}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                setDropTarget(column.value);
              }}
              onDrop={(event) => {
                event.preventDefault();
                onDrop(column.value);
              }}
            >
              <div className="flex items-center gap-2 border-b px-3 py-2.5">
                <span
                  className={cn(
                    "size-2 shrink-0 rounded-full",
                    COLUMN_ACCENT[column.value],
                  )}
                />
                <p className="flex-1 font-medium text-sm">{column.label}</p>
                <span className="rounded-full bg-muted px-2 py-0.5 font-medium text-muted-foreground text-xs">
                  {columnTickets.length}
                </span>
              </div>

              <div className="flex min-h-32 flex-1 flex-col gap-2 p-2">
                {columnTickets.length === 0 && (
                  <div className="flex flex-1 flex-col items-center justify-center gap-1.5 py-6 text-muted-foreground/60">
                    <TicketIcon className="size-5" />
                    <p className="text-xs">Drop tickets here</p>
                  </div>
                )}

                {columnTickets.map((ticket) => (
                  <TicketCard
                    isDragging={draggingId === ticket._id}
                    key={ticket._id}
                    onDragEnd={() => {
                      setDraggingId(null);
                      setDropTarget(null);
                    }}
                    onDragStart={setDraggingId}
                    ticket={ticket}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
