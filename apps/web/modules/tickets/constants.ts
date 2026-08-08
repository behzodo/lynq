export const TICKET_STATUSES = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "waiting", label: "Waiting on customer" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
] as const;

export const TICKET_PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
] as const;

export const TICKET_CATEGORY_LABELS = {
  question: "Question",
  bug: "Bug",
  billing: "Billing",
  feature: "Feature request",
  other: "Other",
} as const;

export const TICKET_STATUS_LABELS = {
  open: "Open",
  in_progress: "In progress",
  waiting: "Waiting on customer",
  resolved: "Resolved",
  closed: "Closed",
} as const;

export const TICKET_STATUS_CLASSES = {
  open: "bg-foreground hover:bg-foreground",
  in_progress: "bg-amber-500 hover:bg-amber-500",
  waiting: "bg-purple-600 hover:bg-purple-600",
  resolved: "bg-green-600 hover:bg-green-600",
  closed: "bg-muted-foreground hover:bg-muted-foreground",
} as const;

export const TICKET_PRIORITY_CLASSES = {
  low: "text-muted-foreground",
  medium: "text-foreground",
  high: "text-amber-600",
  urgent: "text-destructive",
} as const;
