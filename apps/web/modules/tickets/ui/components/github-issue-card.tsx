"use client";

import { api } from "@workspace/backend/_generated/api";
import { Id } from "@workspace/backend/_generated/dataModel";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import { useAction, useMutation, useQuery } from "convex/react";
import {
  CheckCircle2Icon,
  ExternalLinkIcon,
  GithubIcon,
  Loader2Icon,
  SendIcon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const GithubIssueCard = ({
  ticketId,
}: {
  ticketId: Id<"tickets">;
}) => {
  const connection = useQuery(api.private.github.getConnection);
  const link = useQuery(api.private.github.getTicketLink, { ticketId });
  const draft = useQuery(api.private.github.getFixedDraft, { ticketId });

  const createIssue = useAction(api.private.github.createIssueForTicket);
  const notifyCustomer = useMutation(api.private.github.notifyCustomerFixed);

  const [includeConversation, setIncludeConversation] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isNotifying, setIsNotifying] = useState(false);
  const [message, setMessage] = useState("");
  const [showNotify, setShowNotify] = useState(false);

  // Nothing to offer until GitHub is set up
  if (!connection?.isConfigured) {
    return null;
  }

  const handleCreate = async () => {
    setIsCreating(true);

    try {
      const result = await createIssue({
        ticketId,
        includeConversation,
        dashboardUrl: window.location.origin,
      });

      toast.success(`Created issue #${result.issueNumber}`);
    } catch (error) {
      const data = (error as { data?: { message?: string } })?.data;
      toast.error(data?.message ?? "Could not create the GitHub issue");
    } finally {
      setIsCreating(false);
    }
  };

  const handleNotify = async () => {
    const body = (message || draft || "").trim();

    if (!body) {
      toast.error("Write a message first");
      return;
    }

    setIsNotifying(true);

    try {
      await notifyCustomer({ ticketId, body });
      toast.success("Customer notified");
      setShowNotify(false);
    } catch {
      toast.error("Could not send the message");
    } finally {
      setIsNotifying(false);
    }
  };

  if (!link) {
    return (
      <div className="space-y-3 rounded-lg border bg-background p-4">
        <div className="flex items-center gap-2">
          <GithubIcon className="size-4" />
          <p className="font-medium text-sm">Send to engineering</p>
        </div>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Creates an issue in{" "}
          <code className="font-mono text-xs">
            {connection.repoOwner}/{connection.repoName}
          </code>
          {connection.projectTitle ? ` and adds it to ${connection.projectTitle}` : ""}
          .
        </p>

        <div className="flex items-start gap-2 rounded-md bg-muted/50 p-3">
          <Checkbox
            checked={includeConversation}
            id="include-conversation"
            onCheckedChange={(checked) =>
              setIncludeConversation(checked === true)
            }
          />
          <div className="space-y-0.5">
            <Label className="text-sm" htmlFor="include-conversation">
              Include the full conversation
            </Label>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Only do this on a private repository. Customer names and emails are
              always stripped.
            </p>
          </div>
        </div>

        <Button className="w-full" disabled={isCreating} onClick={handleCreate}>
          {isCreating ? <Loader2Icon className="animate-spin" /> : <GithubIcon />}
          Create GitHub issue
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border bg-background p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <GithubIcon className="size-4" />
          <p className="font-medium text-sm">Issue #{link.issueNumber}</p>
        </div>
        <Badge
          className="text-[10px]"
          variant={link.issueState === "closed" ? "secondary" : "outline"}
        >
          {link.issueState === "closed"
            ? link.closedReason === "not_planned"
              ? "closed · not planned"
              : "closed · completed"
            : "open"}
        </Badge>
      </div>

      {link.boardColumn && (
        <p className="text-muted-foreground text-xs">
          Board column: <span className="font-medium">{link.boardColumn}</span>
        </p>
      )}

      <Button asChild className="w-full" size="sm" variant="outline">
        <a href={link.issueUrl} rel="noreferrer" target="_blank">
          View on GitHub
          <ExternalLinkIcon className="size-3.5" />
        </a>
      </Button>

      {link.customerNotifiedAt && (
        <p className="flex items-center gap-1.5 text-muted-foreground text-xs">
          <CheckCircle2Icon className="size-3.5 text-green-600" />
          Customer told it was fixed
        </p>
      )}

      {link.canNotifyCustomer && !showNotify && (
        <div className="space-y-2 rounded-md border border-green-500/30 bg-green-500/5 p-3">
          <p className="font-medium text-sm">Fixed in GitHub 🎉</p>
          <p className="text-muted-foreground text-xs leading-relaxed">
            Let the customer know. We have written it for you.
          </p>
          <Button
            className="w-full"
            onClick={() => {
              setMessage(draft ?? "");
              setShowNotify(true);
            }}
            size="sm"
          >
            <SendIcon className="size-3.5" />
            Notify customer
          </Button>
        </div>
      )}

      {showNotify && (
        <div className="space-y-2">
          <Label htmlFor="fixed-message">Message to the customer</Label>
          <Textarea
            id="fixed-message"
            onChange={(event) => setMessage(event.target.value)}
            rows={6}
            value={message}
          />
          <div className="flex items-center gap-2">
            <Button disabled={isNotifying} onClick={handleNotify} size="sm">
              {isNotifying ? (
                <Loader2Icon className="animate-spin" />
              ) : (
                <SendIcon className="size-3.5" />
              )}
              Send
            </Button>
            <Button
              onClick={() => setShowNotify(false)}
              size="sm"
              variant="ghost"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
