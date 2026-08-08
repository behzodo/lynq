"use client";

import { useState } from "react";
import Link from "next/link";
import { usePaginatedQuery, useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { LayoutGridIcon, ListIcon, Loader2Icon, TicketIcon } from "lucide-react";
import { api } from "@workspace/backend/_generated/api";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { InfiniteScrollTrigger } from "@workspace/ui/components/infinite-scroll-trigger";
import { useInfiniteScroll } from "@workspace/ui/hooks/use-infinite-scroll";
import {
  useCountIncrease,
  useNotificationSound,
} from "@workspace/ui/hooks/use-notification-sound";
import { cn } from "@workspace/ui/lib/utils";
import {
  TICKET_CATEGORY_LABELS,
  TICKET_PRIORITY_CLASSES,
  TICKET_STATUS_CLASSES,
  TICKET_STATUS_LABELS,
  TICKET_STATUSES,
} from "../../constants";
import { TicketBoard } from "../components/ticket-board";

type StatusFilter = (typeof TICKET_STATUSES)[number]["value"] | "all";
type ViewMode = "list" | "board";

export const TicketsView = () => {
  const [status, setStatus] = useState<StatusFilter>("all");
  const [view, setView] = useState<ViewMode>("board");

  const counts = useQuery(api.private.tickets.getCounts);

  // Chime when a customer opens a new ticket while this page is open
  const { play } = useNotificationSound();
  useCountIncrease(counts?.all, () => play("incoming"));

  const tickets = usePaginatedQuery(
    api.private.tickets.getMany,
    status === "all" ? {} : { status },
    { initialNumItems: 15 },
  );

  const { topElementRef, handleLoadMore, canLoadMore, isLoadingMore } =
    useInfiniteScroll({
      status: tickets.status,
      loadMore: tickets.loadMore,
      loadSize: 15,
    });

  return (
    <div className="flex min-h-screen flex-col bg-muted p-8">
      <div
        className={cn(
          "mx-auto w-full",
          view === "board" ? "max-w-screen-2xl" : "max-w-screen-lg",
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-2xl md:text-4xl">Tickets</h1>
            <p className="text-muted-foreground">
              Issues submitted by your customers
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-md border bg-background p-0.5">
              <Button
                className="gap-1.5"
                onClick={() => setView("board")}
                size="sm"
                variant={view === "board" ? "secondary" : "ghost"}
              >
                <LayoutGridIcon className="size-4" />
                Board
              </Button>
              <Button
                className="gap-1.5"
                onClick={() => setView("list")}
                size="sm"
                variant={view === "list" ? "secondary" : "ghost"}
              >
                <ListIcon className="size-4" />
                List
              </Button>
            </div>

            {view === "list" && (
              <Select
                value={status}
                onValueChange={(value) => setStatus(value as StatusFilter)}
              >
                <SelectTrigger className="w-56 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    All {counts ? `(${counts.all})` : ""}
                  </SelectItem>
                  {TICKET_STATUSES.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label} {counts ? `(${counts[option.value]})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {view === "board" && (
          <div className="mt-8">
            <TicketBoard />
          </div>
        )}

        <div className={cn("mt-8 space-y-3", view !== "list" && "hidden")}>
          {tickets.isLoading && tickets.results.length === 0 && (
            <div className="flex items-center justify-center py-16">
              <Loader2Icon className="animate-spin text-muted-foreground" />
            </div>
          )}

          {!tickets.isLoading && tickets.results.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center gap-y-3 py-12 text-center">
                <TicketIcon className="size-8 text-muted-foreground" />
                <div className="space-y-1">
                  <p className="font-medium">No tickets here</p>
                  <p className="text-sm text-muted-foreground">
                    Tickets submitted from your widget show up in this list
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {tickets.results.map((ticket) => (
            <Link href={`/tickets/${ticket._id}`} key={ticket._id}>
              <Card className="transition-colors hover:border-primary/40">
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="w-14 shrink-0 text-sm font-semibold text-muted-foreground">
                    #{ticket.number}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-medium">{ticket.subject}</p>
                      <Badge className={TICKET_STATUS_CLASSES[ticket.status]}>
                        {TICKET_STATUS_LABELS[ticket.status]}
                      </Badge>
                      <Badge variant="secondary">
                        {TICKET_CATEGORY_LABELS[ticket.category]}
                      </Badge>
                      <span
                        className={cn(
                          "text-xs font-medium uppercase",
                          TICKET_PRIORITY_CLASSES[ticket.priority],
                        )}
                      >
                        {ticket.priority}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">
                      {ticket.name} {ticket.surname} · {ticket.email}
                      {ticket.phone ? ` · ${ticket.phone}` : ""}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(ticket.lastMessageAt), {
                        addSuffix: true,
                      })}
                    </p>
                    <p className="text-xs text-muted-foreground/70">
                      {ticket.assigneeName ?? "Unassigned"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}

          <InfiniteScrollTrigger
            canLoadMore={canLoadMore}
            isLoadingMore={isLoadingMore}
            onLoadMore={handleLoadMore}
            ref={topElementRef}
          />
        </div>
      </div>
    </div>
  );
};
