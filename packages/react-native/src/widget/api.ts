import {
  makeFunctionReference,
  type PaginationOptions,
  type PaginationResult,
} from "convex/server";

/**
 * Typed references to the public Convex functions the widget calls.
 *
 * A published package cannot import @workspace/backend's generated `api`,
 * which is private to the monorepo, so the signatures are mirrored here and
 * the functions referenced by path instead. These must stay in step with
 * packages/backend/convex/public/* by hand - there is no compiler tying them
 * together.
 *
 * Ids are plain strings here. Convex brands them in the backend, but on the
 * wire they are strings and the server re-checks every one against the
 * caller's contact session anyway.
 */

export interface WidgetSettings {
  greetMessage: string;
  defaultSuggestions: {
    suggestion1?: string;
    suggestion2?: string;
    suggestion3?: string;
  };
  logoUrl: string | null;
}

export type ConversationStatus = "unresolved" | "escalated" | "resolved";

/** One message in a chat thread, as the agent component stores it. */
export interface ThreadMessage {
  _id: string;
  _creationTime: number;
  text?: string;
  message?: { role?: string };
}

export interface ConversationSummary {
  _id: string;
  _creationTime: number;
  status: ConversationStatus;
  organizationId: string;
  threadId: string;
  lastMessage: ThreadMessage | null;
}

export type TicketStatus =
  | "open"
  | "in_progress"
  | "waiting"
  | "resolved"
  | "closed";

export type TicketCategory =
  | "question"
  | "bug"
  | "billing"
  | "feature"
  | "other";

export interface TicketSummary {
  _id: string;
  number: number;
  subject: string;
  status: TicketStatus;
  category: TicketCategory;
  lastMessageAt: number;
}

export interface TicketMessage {
  _id: string;
  _creationTime: number;
  authorType: "customer" | "agent";
  authorName: string;
  body: string;
}

export interface TicketDetail {
  _id: string;
  number: number;
  subject: string;
  status: TicketStatus;
  priority: "low" | "medium" | "high" | "urgent";
  category: TicketCategory;
  messages: TicketMessage[];
}

export interface ContactSessionMetadata {
  userAgent?: string;
  language?: string;
  platform?: string;
  screenResolution?: string;
  viewportSize?: string;
  timezone?: string;
  timezoneOffset?: number;
  currentUrl?: string;
}

export const validateOrganization = makeFunctionReference<
  "action",
  { organizationId: string },
  { valid: boolean; reason?: string }
>("public/organizations:validate");

export const validateContactSession = makeFunctionReference<
  "mutation",
  { contactSessionId: string },
  { valid: boolean; reason?: string }
>("public/contactSessions:validate");

export const createContactSession = makeFunctionReference<
  "mutation",
  {
    name: string;
    email: string;
    organizationId: string;
    metadata?: ContactSessionMetadata;
  },
  string
>("public/contactSessions:create");

export const getWidgetSettings = makeFunctionReference<
  "query",
  { organizationId: string },
  WidgetSettings | null
>("public/widgetSettings:getByOrganizationId");

export const createConversation = makeFunctionReference<
  "mutation",
  { contactSessionId: string; organizationId: string },
  string
>("public/conversations:create");

export const getConversations = makeFunctionReference<
  "query",
  { contactSessionId: string; paginationOpts: PaginationOptions },
  PaginationResult<ConversationSummary>
>("public/conversations:getMany");

export const getConversation = makeFunctionReference<
  "query",
  { conversationId: string; contactSessionId: string },
  { _id: string; status: ConversationStatus; threadId: string }
>("public/conversations:getOne");

export const getMessages = makeFunctionReference<
  "query",
  {
    threadId: string;
    contactSessionId: string;
    paginationOpts: PaginationOptions;
  },
  PaginationResult<ThreadMessage>
>("public/messages:getMany");

export const createMessage = makeFunctionReference<
  "mutation",
  {
    threadId: string;
    prompt: string;
    contactSessionId: string;
    imageStorageId?: string;
  },
  null
>("public/messages:create");

export const generateUploadUrl = makeFunctionReference<
  "mutation",
  { contactSessionId: string },
  string
>("public/messages:generateUploadUrl");

export const getTickets = makeFunctionReference<
  "query",
  { contactSessionId: string },
  TicketSummary[]
>("public/tickets:getMany");

export const getTicket = makeFunctionReference<
  "query",
  { ticketId: string; contactSessionId: string },
  TicketDetail
>("public/tickets:getOne");

export const createTicket = makeFunctionReference<
  "mutation",
  {
    organizationId: string;
    contactSessionId: string;
    name: string;
    surname: string;
    email: string;
    phone?: string;
    category: TicketCategory;
    subject: string;
    description: string;
  },
  { ticketId: string; number: number }
>("public/tickets:create");

export const addTicketMessage = makeFunctionReference<
  "mutation",
  { ticketId: string; contactSessionId: string; body: string },
  null
>("public/tickets:addMessage");
