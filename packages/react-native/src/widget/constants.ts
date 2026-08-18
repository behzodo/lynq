import type { TicketCategory, TicketStatus } from "./api";

/** Where the contact session id is kept, per organization. */
export const CONTACT_SESSION_KEY = "echo_contact_session";

export const WIDGET_SCREENS = [
  "error",
  "loading",
  "selection",
  "auth",
  "inbox",
  "chat",
  "ticket-form",
  "tickets",
  "ticket",
] as const;

export type WidgetScreen = (typeof WIDGET_SCREENS)[number];

export const TICKET_CATEGORIES: { value: TicketCategory; label: string }[] = [
  { value: "question", label: "Question" },
  { value: "bug", label: "Something is broken" },
  { value: "billing", label: "Billing" },
  { value: "feature", label: "Feature request" },
  { value: "other", label: "Other" },
];

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  waiting: "Waiting for you",
  resolved: "Resolved",
  closed: "Closed",
};

/** How many items each page of the inbox and of a chat holds. */
export const PAGE_SIZE = 10;
