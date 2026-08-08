"use client";

import Bowser from "bowser";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@workspace/ui/components/accordion";
import { getCountryFlagUrl, getCountryFromTimezone } from "@/lib/country-utils";
import { api } from "@workspace/backend/_generated/api";
import { Id } from "@workspace/backend/_generated/dataModel";
import { Button } from "@workspace/ui/components/button";
import { DicebearAvatar } from "@workspace/ui/components/dicebear-avatar";
import { useQuery } from "convex/react";
import {
  ClockIcon,
  GlobeIcon,
  MailIcon,
  MonitorIcon,
  SendIcon,
  TicketPlusIcon,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { CreateTicketDialog } from "@/modules/tickets/ui/components/create-ticket-dialog";
import {
  TICKET_STATUS_CLASSES,
  TICKET_STATUS_LABELS,
} from "@/modules/tickets/constants";
import { Badge } from "@workspace/ui/components/badge";

type InfoItem = {
  label: string;
  value: string | React.ReactNode;
  className?: string;
};

type InfoSection = {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  items: InfoItem[];
};

export const ContactPanel = () => {
  const params = useParams();
  const conversationId = params.conversationId as (Id<"conversations"> | null);

  const contactSession = useQuery(api.private.contactSessions.getOneByConversationId,
    conversationId ? {
      conversationId,
    } : "skip",
  );

  const relatedTickets = useQuery(
    api.private.tickets.getByConversationId,
    conversationId ? { conversationId } : "skip",
  );

  const telegram = useQuery(
    api.private.telegram.getProfileByConversationId,
    conversationId ? { conversationId } : "skip",
  );

  const [isTicketDialogOpen, setIsTicketDialogOpen] = useState(false);

  const parseUserAgent = useMemo(() => {
    return (userAgent?: string) => {
      if (!userAgent) {
        return { browser: "Unknown", os: "Unknown", device: "Unknown" };
      }

      const browser = Bowser.getParser(userAgent);
      const result = browser.getResult();

      return {
        browser: result.browser.name || "Unknown",
        browserVersion: result.browser.version || "",
        os: result.os.name || "Unknown",
        osVersion: result.os.version || "",
        device: result.platform.type || "desktop",
        deviceVendor: result.platform.vendor || "",
        deviceModel: result.platform.model || "",
      };
    };
  }, []);

  const userAgentInfo = useMemo(() => 
    parseUserAgent(contactSession?.metadata?.userAgent), 
  [contactSession?.metadata?.userAgent, parseUserAgent]);

  const countryInfo = useMemo(() => {
    return getCountryFromTimezone(contactSession?.metadata?.timezone);
  }, [contactSession?.metadata?.timezone]);

  const accordionSections = useMemo<InfoSection[]>(() => {
    if (!contactSession?.metadata) {
      return [];
    }

    return [
      {
        id: "device-info",
        icon: MonitorIcon,
        title: "Device Information",
        items: [
          {
            label: "Browser",
            value:
              userAgentInfo.browser + 
                (userAgentInfo.browserVersion
                  ? ` ${userAgentInfo.browserVersion}`
                  : ""
                ),
          },
          {
            label: "OS",
            value:
              userAgentInfo.os +
                (userAgentInfo.osVersion ? ` ${userAgentInfo.osVersion}` : ""),
          },
          {
            label: "Device",
            value:
              userAgentInfo.device +
                (
                  userAgentInfo.deviceModel
                    ? ` - ${userAgentInfo.deviceModel}`
                    : ""
                ),
              className: "capitalize"
          },
          {
            label: "Screen",
            value: contactSession.metadata.screenResolution,
          },
          {
            label: "Viewport",
            value: contactSession.metadata.viewportSize,
          },
          {
            label: "Cookies",
            value: contactSession.metadata.cookieEnabled ? "Enabled" : "Disabled"
          },
        ],
      },
      {
        id: "location-info",
        icon: GlobeIcon,
        title: "Location & Language",
        items: [
          ...(countryInfo
            ? [
              {
                label: "Country",
                value: (
                  <span>
                    {countryInfo.name}
                  </span>
                )
              }
            ]
            : []
          ),
          {
            label: "Language",
            value: contactSession.metadata.language,
          },
          {
            label: "Timezone",
            value: contactSession.metadata.timezone,
          },
          {
            label: "UTC Offset",
            value: contactSession.metadata.timezoneOffset,
          }
        ]
      },
      {
        id: "section-details",
        title: "Section details",
        icon: ClockIcon,
        items: [
          {
            label: "Session Started",
            value: new Date(
              contactSession._creationTime
            ).toLocaleString(),
          }
        ],
      }
    ];
  }, [contactSession, userAgentInfo, countryInfo]);

  // Telegram contacts carry identity the browser can never give us
  const telegramSection = useMemo<InfoSection | null>(() => {
    if (!telegram) {
      return null;
    }

    const { profile, chatId } = telegram;

    const items: InfoItem[] = [
      { label: "Name", value: [profile.firstName, profile.lastName].filter(Boolean).join(" ") || "—" },
      {
        label: "Username",
        value: profile.username ? `@${profile.username}` : "—",
      },
      { label: "Phone", value: profile.phone || "—" },
      { label: "Email", value: profile.email || "—" },
      { label: "Language", value: profile.languageCode || "—" },
      { label: "Telegram ID", value: profile.telegramUserId || chatId },
    ];

    return {
      id: "telegram",
      icon: SendIcon,
      title: "Telegram profile",
      items,
    };
  }, [telegram]);

  const sections = telegramSection
    ? [telegramSection, ...accordionSections]
    : accordionSections;

  if (contactSession === undefined || contactSession === null) {
    return null;
  }

  return (
    <div className="flex h-full w-full flex-col bg-background text-foreground">
      <div className="flex flex-col gap-y-4 p-4">
        <div className="flex items-center gap-x-2">
          <DicebearAvatar
            badgeImageUrl={
              countryInfo?.code
                ? getCountryFlagUrl(countryInfo.code)
                : undefined
            }
            seed={contactSession._id}
            size={42}
          />
          <div className="flex-1 overflow-hidden">
            <div className="flex items-center gap-x-2">
              <h4 className="line-clamp-1">
                {contactSession.name}
              </h4>
            </div>
            <p className="line-clamp-1 text-muted-foreground text-sm">
              {contactSession.email}
            </p>
          </div>
        </div>
        <Button asChild className="w-full" size="lg">
          <Link href={`mailto:${contactSession.email}`}>
            <MailIcon />
            <span>Send Email</span>
          </Link>
        </Button>

        <Button
          className="w-full"
          onClick={() => setIsTicketDialogOpen(true)}
          size="lg"
          variant="outline"
        >
          <TicketPlusIcon />
          <span>Create Ticket</span>
        </Button>

        {relatedTickets && relatedTickets.length > 0 && (
          <div className="w-full space-y-1.5">
            <p className="text-muted-foreground text-xs">
              Tickets from this contact
            </p>
            {relatedTickets.map((ticket) => (
              <Link
                className="flex items-center gap-2 rounded-md border px-2.5 py-2 transition-colors hover:border-primary/40"
                href={`/tickets/${ticket._id}`}
                key={ticket._id}
              >
                <span className="shrink-0 font-medium text-muted-foreground text-xs">
                  #{ticket.number}
                </span>
                <span className="line-clamp-1 flex-1 text-sm">
                  {ticket.subject}
                </span>
                <Badge className={TICKET_STATUS_CLASSES[ticket.status]}>
                  {TICKET_STATUS_LABELS[ticket.status]}
                </Badge>
              </Link>
            ))}
          </div>
        )}
      </div>

      {conversationId && (
        <CreateTicketDialog
          contactEmail={contactSession.email}
          contactName={contactSession.name}
          conversationId={conversationId}
          onOpenChange={setIsTicketDialogOpen}
          open={isTicketDialogOpen}
        />
      )}

      <div>
        {sections.length > 0 && (
          <Accordion
            className="w-full rounded-none border-y"
            collapsible
            type="single"
          >
            {sections.map((section) => (
              <AccordionItem
                className="rounded-none outline-none has-focus-visible:z-10 has-focus-visible:border-ring has-focus-visible:ring-[3px] has-focus-visible:ring-ring/50"
                key={section.id}
                value={section.id}
              >
                <AccordionTrigger
                  className="flex w-full flex-1 items-start justify-between gap-4 rounded-none bg-accent px-5 py-4 text-left font-medium text-sm outline-none transition-all hover:no-underline disabled:pointer-events-none disabled:opacity-50"
                >
                  <div className="flex items-center gap-4">
                    <section.icon className="size-4 shrink-0" />
                    <span>{section.title}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-5 py-4">
                  <div className="space-y-2 text-sm">
                    {section.items.map((item) => (
                      <div className="flex justify-between" key={`${section.id}-${item.label}`}>
                        <span className="text-muted-foreground">
                          {item.label}:
                        </span>
                        <span className={item.className}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </div>
    </div>
  );
};
