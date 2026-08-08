"use client";

import { WidgetHeader } from "@/modules/widget/ui/components/widget-header";
import { Button } from "@workspace/ui/components/button";
import { useAtomValue, useSetAtom } from "jotai";
import { ChevronRightIcon, MessageSquareTextIcon, TicketIcon } from "lucide-react";
import { contactSessionIdAtomFamily, conversationIdAtom, errorMessageAtom, organizationIdAtom, screenAtom, widgetSettingsAtom } from "../../atoms/widget-atoms";
import { useMutation } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { useState } from "react";
import { WidgetFooter } from "../components/widget-footer";

export const WidgetSelectionScreen = () => {
  const setScreen = useSetAtom(screenAtom);
  const setErrorMessage = useSetAtom(errorMessageAtom);
  const setConversationId = useSetAtom(conversationIdAtom);

  const organizationId = useAtomValue(organizationIdAtom);
  const widgetSettings = useAtomValue(widgetSettingsAtom);
  const contactSessionId = useAtomValue(
    contactSessionIdAtomFamily(organizationId || "")
  );

  const createConversation = useMutation(api.public.conversations.create);
  const [isPending, setIsPending] = useState(false);

  const handleNewConversation = async () => {
    if (!organizationId) {
      setScreen("error");
      setErrorMessage("Missing Organization ID");
      return;
    }
    
    if (!contactSessionId) {
      setScreen("auth");
      return;
    }
    
    setIsPending(true);
    try {
      const conversationId = await createConversation({
        contactSessionId,
        organizationId,
      });

      setConversationId(conversationId);
      setScreen("chat");
    } catch {
      setScreen("auth");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <>
      <WidgetHeader>
        <div className="flex flex-col justify-between gap-y-3 px-2 py-6">
          <div className="flex items-center justify-between gap-x-3 animate-widget-rise">
            <div className="flex items-center gap-x-2">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full rounded-full bg-emerald-300 animate-widget-pulse-ring" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
              </span>
              <span className="text-xs font-medium uppercase tracking-wider text-primary-foreground/70">
                We&apos;re online
              </span>
            </div>

            {widgetSettings?.logoUrl && (
              // Remote Convex storage URL, so a plain img avoids next/image
              // remote-pattern configuration
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt="Brand logo"
                className="size-9 rounded-lg bg-white/90 object-contain p-1 shadow-sm"
                src={widgetSettings.logoUrl}
              />
            )}
          </div>
          <p className="text-3xl font-semibold tracking-tight animate-widget-rise [animation-delay:60ms]">
            Hi there! 👋
          </p>
          <p className="text-lg font-medium text-primary-foreground/80 animate-widget-rise [animation-delay:120ms]">
            Let&apos;s get you started
          </p>
        </div>
      </WidgetHeader>
      <div className="flex flex-1 flex-col gap-y-4 p-4 overflow-y-auto">
        <Button
          className="group h-auto w-full justify-between rounded-xl border-border/70 bg-background p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md disabled:translate-y-0 animate-widget-rise [animation-delay:180ms]"
          variant="outline"
          onClick={handleNewConversation}
          disabled={isPending}
        >
          <div className="flex items-center gap-x-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <MessageSquareTextIcon className="size-5" />
            </div>
            <div className="flex flex-col items-start gap-y-0.5">
              <span className="font-semibold">Start chat</span>
              <span className="text-xs font-normal text-muted-foreground">
                {isPending ? "Setting things up…" : "Typically replies in a few minutes"}
              </span>
            </div>
          </div>
          <ChevronRightIcon className="size-4 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-primary" />
        </Button>

        <Button
          className="group h-auto w-full justify-between rounded-xl border-border/70 bg-background p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md disabled:translate-y-0 animate-widget-rise [animation-delay:240ms]"
          variant="outline"
          onClick={() => setScreen("tickets")}
          disabled={isPending}
        >
          <div className="flex items-center gap-x-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <TicketIcon className="size-5" />
            </div>
            <div className="flex flex-col items-start gap-y-0.5">
              <span className="font-semibold">Submit a ticket</span>
              <span className="text-xs font-normal text-muted-foreground">
                For issues that need tracking
              </span>
            </div>
          </div>
          <ChevronRightIcon className="size-4 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-primary" />
        </Button>
      </div>
      <WidgetFooter />
    </>
  );
};
