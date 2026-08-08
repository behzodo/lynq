"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import {
  ArrowLeftIcon,
  Loader2Icon,
  MailIcon,
  PhoneIcon,
  SendIcon,
  Trash2Icon,
  UserIcon,
} from "lucide-react";
import { api } from "@workspace/backend/_generated/api";
import { Id } from "@workspace/backend/_generated/dataModel";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";
import { Card, CardContent } from "@workspace/ui/components/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  useCountIncrease,
  useNotificationSound,
} from "@workspace/ui/hooks/use-notification-sound";
import { cn } from "@workspace/ui/lib/utils";
import {
  TICKET_CATEGORY_LABELS,
  TICKET_PRIORITIES,
  TICKET_STATUS_CLASSES,
  TICKET_STATUS_LABELS,
  TICKET_STATUSES,
} from "../../constants";

interface Props {
  ticketId: Id<"tickets">;
};

export const TicketIdView = ({ ticketId }: Props) => {
  const router = useRouter();

  const ticket = useQuery(api.private.tickets.getOne, { ticketId });
  const updateStatus = useMutation(api.private.tickets.updateStatus);
  const updatePriority = useMutation(api.private.tickets.updatePriority);
  const assignToMe = useMutation(api.private.tickets.assignToMe);
  const unassign = useMutation(api.private.tickets.unassign);
  const addMessage = useMutation(api.private.tickets.addMessage);
  const remove = useMutation(api.private.tickets.remove);

  const [body, setBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Chime when the customer replies while the ticket is open on screen
  const { play } = useNotificationSound();
  useCountIncrease(
    ticket?.messages.filter((message) => message.authorType === "customer")
      .length,
    () => play("incoming"),
  );

  if (ticket === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted">
        <Loader2Icon className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  const onSend = async () => {
    if (!body.trim()) {
      return;
    }

    setIsSending(true);
    try {
      await addMessage({ ticketId, body: body.trim() });
      setBody("");
      play("outgoing");
    } catch (error) {
      console.error(error);
      toast.error("Could not send reply");
    } finally {
      setIsSending(false);
    }
  };

  const onDelete = async () => {
    try {
      await remove({ ticketId });
      toast.success("Ticket deleted");
      router.push("/tickets");
    } catch (error) {
      console.error(error);
      toast.error("Could not delete ticket");
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-muted p-8">
      <div className="mx-auto w-full max-w-screen-lg">
        <Link
          className="mb-4 inline-flex items-center gap-x-2 text-sm text-muted-foreground hover:text-foreground"
          href="/tickets"
        >
          <ArrowLeftIcon className="size-4" />
          Back to tickets
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl md:text-3xl">
                #{ticket.number} · {ticket.subject}
              </h1>
              <Badge className={TICKET_STATUS_CLASSES[ticket.status]}>
                {TICKET_STATUS_LABELS[ticket.status]}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {TICKET_CATEGORY_LABELS[ticket.category]} · opened{" "}
              {formatDistanceToNow(new Date(ticket._creationTime), {
                addSuffix: true,
              })}
            </p>
          </div>

          <Button
            onClick={() => setConfirmDelete(true)}
            size="icon"
            variant="ghost"
          >
            <Trash2Icon className="size-4 text-destructive" />
          </Button>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {/* Thread */}
          <div className="space-y-3 lg:col-span-2">
            {ticket.messages.map((message) => (
              <div
                key={message._id}
                className={cn(
                  "flex flex-col gap-y-1",
                  message.authorType === "agent" ? "items-end" : "items-start",
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] whitespace-pre-wrap rounded-xl px-3 py-2 text-sm",
                    message.authorType === "agent"
                      ? "bg-primary text-primary-foreground"
                      : "bg-background border",
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

            <Card>
              <CardContent className="space-y-3 py-4">
                <Textarea
                  onChange={(event) => setBody(event.target.value)}
                  placeholder="Write a reply to the customer..."
                  rows={4}
                  value={body}
                />
                <div className="flex justify-end">
                  <Button
                    disabled={isSending || !body.trim()}
                    onClick={onSend}
                  >
                    <SendIcon className="size-4" />
                    Send reply
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <Card>
              <CardContent className="space-y-4 py-4">
                <p className="text-sm font-medium">Contact</p>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p className="flex items-center gap-x-2">
                    <UserIcon className="size-4 shrink-0" />
                    {ticket.name} {ticket.surname}
                  </p>
                  <p className="flex items-center gap-x-2">
                    <MailIcon className="size-4 shrink-0" />
                    <a className="truncate hover:underline" href={`mailto:${ticket.email}`}>
                      {ticket.email}
                    </a>
                  </p>
                  {ticket.phone && (
                    <p className="flex items-center gap-x-2">
                      <PhoneIcon className="size-4 shrink-0" />
                      <a className="hover:underline" href={`tel:${ticket.phone}`}>
                        {ticket.phone}
                      </a>
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-4 py-4">
                <div className="space-y-1.5">
                  <p className="text-sm font-medium">Status</p>
                  <Select
                    value={ticket.status}
                    onValueChange={(value) =>
                      updateStatus({
                        ticketId,
                        status: value as typeof ticket.status,
                      })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TICKET_STATUSES.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <p className="text-sm font-medium">Priority</p>
                  <Select
                    value={ticket.priority}
                    onValueChange={(value) =>
                      updatePriority({
                        ticketId,
                        priority: value as typeof ticket.priority,
                      })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TICKET_PRIORITIES.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <p className="text-sm font-medium">Assignee</p>
                  <p className="text-sm text-muted-foreground">
                    {ticket.assigneeName ?? "Unassigned"}
                  </p>
                  {ticket.assigneeName ? (
                    <Button
                      className="w-full"
                      onClick={() => unassign({ ticketId })}
                      size="sm"
                      variant="outline"
                    >
                      Unassign
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      onClick={() => assignToMe({ ticketId })}
                      size="sm"
                      variant="outline"
                    >
                      Assign to me
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete ticket?</AlertDialogTitle>
            <AlertDialogDescription>
              Ticket #{ticket.number} and its whole message history will be
              permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
