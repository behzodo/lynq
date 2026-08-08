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

export const CONTACT_SESSION_KEY = "echo_contact_session";

export const TICKET_CATEGORIES = [
  { value: "question", label: "Question" },
  { value: "bug", label: "Something is broken" },
  { value: "billing", label: "Billing" },
  { value: "feature", label: "Feature request" },
  { value: "other", label: "Other" },
] as const;

export const TICKET_STATUS_LABELS = {
  open: "Open",
  in_progress: "In progress",
  waiting: "Waiting for you",
  resolved: "Resolved",
  closed: "Closed",
} as const;
