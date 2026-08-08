"use client";

import { useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import {
  CheckCircle2Icon,
  ExternalLinkIcon,
  Loader2Icon,
  RefreshCwIcon,
  SendIcon,
} from "lucide-react";
import { api } from "@workspace/backend/_generated/api";
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
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Switch } from "@workspace/ui/components/switch";

const SETUP_STEPS = [
  {
    title: "Open @BotFather in Telegram",
    detail: "Search for BotFather (the one with the blue check) and press Start.",
  },
  {
    title: "Send /newbot",
    detail: "Pick a display name, then a username ending in 'bot'.",
  },
  {
    title: "Copy the token",
    detail: "BotFather replies with a token like 123456789:AAG...  Paste it below.",
  },
];

/**
 * Connect / manage the Telegram bot. Rendered inside Setup & Integrations.
 */
export const TelegramPanel = () => {
  const integration = useQuery(api.private.telegram.getOne);
  const connect = useAction(api.private.telegram.connect);
  const disconnect = useAction(api.private.telegram.disconnect);
  const resync = useAction(api.private.telegram.resync);
  const setActive = useMutation(api.private.telegram.setActive);

  const [botToken, setBotToken] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  const onConnect = async () => {
    if (!botToken.trim()) {
      return;
    }

    setIsConnecting(true);
    try {
      const { botUsername } = await connect({ botToken: botToken.trim() });
      setBotToken("");
      toast.success(`Connected @${botUsername}`);
    } catch (error) {
      const message =
        error instanceof ConvexError
          ? (error.data as { message?: string })?.message
          : undefined;
      toast.error(message ?? "Could not connect the bot");
    } finally {
      setIsConnecting(false);
    }
  };

  const onDisconnect = async () => {
    try {
      await disconnect();
      toast.success("Telegram bot disconnected");
    } catch (error) {
      console.error(error);
      toast.error("Could not disconnect");
    } finally {
      setConfirmDisconnect(false);
    }
  };

  if (integration === undefined) {
    return (
      <div className="flex items-center justify-center rounded-lg border bg-background py-10">
        <Loader2Icon className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border bg-background p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#229ED9] text-white">
              <SendIcon className="size-5" />
            </div>
            <div>
              <p className="flex items-center gap-2 font-medium">
                {integration ? `@${integration.botUsername}` : "Telegram Bot"}
                {integration && (
                  <CheckCircle2Icon className="size-4 text-green-600" />
                )}
              </p>
              <p className="text-muted-foreground text-sm">
                {integration
                  ? "Bot connected"
                  : "Let customers chat with your AI agent in Telegram"}
              </p>
            </div>
          </div>

          {integration &&
            (integration.isActive ? (
              <Badge className="bg-green-600 hover:bg-green-600">Live</Badge>
            ) : (
              <Badge variant="outline">Paused</Badge>
            ))}
        </div>

        {integration ? (
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <p className="font-medium text-sm">Answer messages</p>
                <p className="text-muted-foreground text-sm">
                  Turn off to make the bot ignore incoming messages
                </p>
              </div>
              <Switch
                checked={integration.isActive}
                onCheckedChange={(checked) =>
                  setActive({ isActive: checked }).catch(() =>
                    toast.error("Could not update"),
                  )
                }
              />
            </div>

            <p className="text-muted-foreground text-sm">
              Open Telegram, search for{" "}
              <span className="font-medium text-foreground">
                @{integration.botUsername}
              </span>{" "}
              and press Start. The chat shows up in Conversations just like a
              website chat.
            </p>

            <div className="flex flex-wrap justify-between gap-2">
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline">
                  <a
                    href={`https://t.me/${integration.botUsername}`}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    Open bot
                    <ExternalLinkIcon className="size-3.5" />
                  </a>
                </Button>
                <Button
                  onClick={() =>
                    resync()
                      .then(() => toast.success("Bot setup refreshed"))
                      .catch(() => toast.error("Could not refresh"))
                  }
                  size="sm"
                  variant="outline"
                >
                  <RefreshCwIcon className="size-3.5" />
                  Refresh setup
                </Button>
              </div>
              <Button
                onClick={() => setConfirmDisconnect(true)}
                size="sm"
                variant="destructive"
              >
                Disconnect
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="space-y-3">
              {SETUP_STEPS.map((step, index) => (
                <div className="flex gap-3" key={step.title}>
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary font-medium text-primary-foreground text-xs">
                    {index + 1}
                  </span>
                  <div className="space-y-0.5">
                    <p className="font-medium text-sm">{step.title}</p>
                    <p className="text-muted-foreground text-sm">
                      {step.detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <Button asChild size="sm" variant="outline">
              <a
                href="https://t.me/BotFather"
                rel="noopener noreferrer"
                target="_blank"
              >
                Open @BotFather
                <ExternalLinkIcon className="size-3.5" />
              </a>
            </Button>

            <div className="space-y-1.5">
              <Label htmlFor="bot-token">Bot token</Label>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  autoComplete="off"
                  className="min-w-56 flex-1"
                  id="bot-token"
                  onChange={(event) => setBotToken(event.target.value)}
                  placeholder="123456789:AAG..."
                  type="password"
                  value={botToken}
                />
                <Button
                  disabled={isConnecting || !botToken.trim()}
                  onClick={onConnect}
                >
                  {isConnecting ? (
                    <>
                      <Loader2Icon className="size-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    "Connect bot"
                  )}
                </Button>
              </div>
              <p className="text-muted-foreground text-xs">
                Stored on your Convex deployment and never shown again.
              </p>
            </div>
          </div>
        )}
      </div>

      <AlertDialog onOpenChange={setConfirmDisconnect} open={confirmDisconnect}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect the bot?</AlertDialogTitle>
            <AlertDialogDescription>
              The webhook is removed and the bot stops answering. Past
              conversations stay in your dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onDisconnect}>
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
