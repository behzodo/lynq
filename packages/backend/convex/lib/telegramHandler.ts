import type { ActionCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { api, internal } from "../_generated/api";
import {
  answerCallbackQuery,
  downloadFile,
  editMessageReplyMarkup,
  inlineKeyboard,
  persistentKeyboard,
  removeKeyboard,
  sendMessage,
  shareContactKeyboard,
} from "./telegram";

type Integration = Doc<"telegramIntegrations">;
type Chat = Doc<"telegramChats">;
type TicketCategory = Doc<"tickets">["category"];

type TelegramUser = {
  id?: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
};

type TelegramPhoto = { file_id?: string; file_size?: number };

export type TelegramUpdate = {
  message?: {
    message_id?: number;
    chat?: { id?: number };
    text?: string;
    caption?: string;
    photo?: TelegramPhoto[];
    document?: { file_id?: string; mime_type?: string };
    contact?: { phone_number?: string; first_name?: string; last_name?: string };
    from?: TelegramUser;
  };
  callback_query?: {
    id?: string;
    data?: string;
    from?: TelegramUser;
    message?: { message_id?: number; chat?: { id?: number } };
  };
};

const CATEGORIES: { value: TicketCategory; label: string }[] = [
  { value: "question", label: "❓ Question" },
  { value: "bug", label: "🐞 Something is broken" },
  { value: "billing", label: "💳 Billing" },
  { value: "feature", label: "💡 Feature request" },
  { value: "other", label: "📦 Other" },
];

const STATUS_LABELS: Record<Doc<"tickets">["status"], string> = {
  open: "🟢 Open",
  in_progress: "🟡 In progress",
  waiting: "🟣 Waiting for you",
  resolved: "✅ Resolved",
  closed: "🔒 Closed",
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MAIN_MENU = inlineKeyboard([
  [{ text: "💬 Message support", callback_data: "menu:chat" }],
  [{ text: "🎫 New ticket", callback_data: "menu:newticket" }],
  [{ text: "📋 My tickets", callback_data: "menu:tickets" }],
]);

const MENU_TEXT = "What would you like to do?";

// Reply-keyboard labels. These arrive as ordinary text, so they are matched
// before anything else and never reach the conversation or a ticket.
const DONE_CHAT_LABEL = "✅ I'm done";
const DONE_TICKET_LABEL = "✅ Mark as done";
const HOME_LABEL = "🏠 Main menu";

const CHAT_KEYBOARD = persistentKeyboard([[DONE_CHAT_LABEL, HOME_LABEL]]);
const TICKET_KEYBOARD = persistentKeyboard([[DONE_TICKET_LABEL, HOME_LABEL]]);

export async function handleTelegramUpdate(
  ctx: ActionCtx,
  integration: Integration,
  update: TelegramUpdate,
): Promise<void> {
  const callback = update.callback_query;
  const message = update.message;

  const chatId = callback?.message?.chat?.id ?? message?.chat?.id;

  if (chatId === undefined) {
    return;
  }

  const chatIdString = String(chatId);
  const from = callback?.from ?? message?.from;

  const send = (text: string, replyMarkup?: unknown) =>
    sendMessage(integration.botToken, chatIdString, text, replyMarkup);

  // Make sure the conversation/session exist before anything else
  const conversation = await ctx.runMutation(
    internal.system.telegram.ensureChat,
    {
      organizationId: integration.organizationId,
      chatId: chatIdString,
      displayName:
        [from?.first_name, from?.last_name].filter(Boolean).join(" ") ||
        from?.username ||
        "Telegram user",
    },
  );

  // Telegram profile fields are free - record them every time they may change
  if (from) {
    await ctx.runMutation(internal.system.telegram.updateProfile, {
      organizationId: integration.organizationId,
      chatId: chatIdString,
      profile: {
        telegramUserId: from.id === undefined ? undefined : String(from.id),
        username: from.username,
        firstName: from.first_name,
        lastName: from.last_name,
        languageCode: from.language_code,
      },
    });
  }

  const chat = await ctx.runQuery(internal.system.telegram.getChatState, {
    organizationId: integration.organizationId,
    chatId: chatIdString,
  });

  if (!chat) {
    return;
  }

  const setState = (args: {
    mode: "onboarding" | "chat" | "ticket_form" | "ticket_reply";
    onboardingStep?: string;
    ticketDraft?: Chat["ticketDraft"];
    activeTicketId?: Id<"tickets">;
  }) =>
    ctx.runMutation(internal.system.telegram.setChatState, {
      organizationId: integration.organizationId,
      chatId: chatIdString,
      ...args,
    });

  // ---------------------------------------------------------- button presses

  if (callback) {
    if (callback.id) {
      await answerCallbackQuery(integration.botToken, callback.id);
    }

    // Buttons are single-use so the chat can't be driven backwards
    if (callback.message?.message_id) {
      await editMessageReplyMarkup(
        integration.botToken,
        chatIdString,
        callback.message.message_id,
      );
    }

    await handleCallback({
      ctx,
      integration,
      chatIdString,
      chat,
      conversation,
      data: callback.data ?? "",
      send,
      setState,
    });
    return;
  }

  if (!message) {
    return;
  }

  const text = (message.text ?? message.caption ?? "").trim();

  // Keyboard buttons come in as plain text - handle them before mode routing
  if (text === HOME_LABEL) {
    await setState({ mode: "chat" });
    await send("👌", removeKeyboard);
    await showMenu(ctx, integration, send);
    return;
  }

  if (text === DONE_CHAT_LABEL) {
    await ctx.runMutation(internal.system.telegram.resolveConversation, {
      conversationId: conversation.conversationId,
    });

    await setState({ mode: "chat" });
    await send("Marked as done ✅ Message us any time.", removeKeyboard);
    await showMenu(ctx, integration, send);
    return;
  }

  if (text === DONE_TICKET_LABEL) {
    if (!chat.activeTicketId) {
      await setState({ mode: "chat" });
      await send("👌", removeKeyboard);
      await showMenu(ctx, integration, send);
      return;
    }

    const resolved = await ctx.runMutation(
      internal.system.telegram.resolveTicket,
      {
        ticketId: chat.activeTicketId,
        contactSessionId: chat.contactSessionId,
      },
    );

    await setState({ mode: "chat" });
    await send(
      resolved
        ? `Ticket #${resolved.number} marked as done ✅ Thanks!`
        : "I couldn't find that ticket.",
      removeKeyboard,
    );
    await showMenu(ctx, integration, send);
    return;
  }

  // /start always returns to a known-good state
  if (text === "/start" || text === "/menu") {
    if (chat.mode === "onboarding" || !chat.profile?.email) {
      await startOnboarding(ctx, integration, chatIdString, send, setState);
      return;
    }

    await setState({ mode: "chat" });
    await showMenu(ctx, integration, send);
    return;
  }

  // ------------------------------------------------------------- onboarding

  if (chat.mode === "onboarding") {
    await handleOnboarding({
      ctx,
      integration,
      chatIdString,
      chat,
      message,
      text,
      send,
      setState,
    });
    return;
  }

  // Photos and image documents become a hosted URL we can embed as markdown
  const imageUrl = await storeIncomingImage(ctx, integration, message);
  const body = [text, imageUrl ? `![Attached image](${imageUrl})` : ""]
    .filter(Boolean)
    .join("\n\n");

  // -------------------------------------------------------- ticket wizard

  if (chat.mode === "ticket_form" && chat.ticketDraft) {
    await handleTicketForm({
      ctx,
      integration,
      chatIdString,
      chat,
      text,
      imageUrl,
      send,
      setState,
    });
    return;
  }

  if (!body) {
    return;
  }

  // --------------------------------------------------------- ticket replies

  if (chat.mode === "ticket_reply" && chat.activeTicketId) {
    const result = await ctx.runMutation(
      internal.system.telegram.addTicketMessage,
      {
        ticketId: chat.activeTicketId,
        contactSessionId: chat.contactSessionId,
        body,
      },
    );

    if (!result.ok) {
      await setState({ mode: "chat" });
      await send(
        result.reason === "closed"
          ? "That ticket is closed."
          : "I couldn't find that ticket.",
        removeKeyboard,
      );
      await showMenu(ctx, integration, send);
      return;
    }

    // No reply here on purpose - the keyboard already shows what's available,
    // and an ack after every message buries the actual conversation.
    return;
  }

  // ------------------------------------------------------------- live chat

  // A message on a resolved conversation reopens it for the operators
  await ctx.runMutation(internal.system.telegram.reopenConversation, {
    conversationId: conversation.conversationId,
  });

  await ctx.runMutation(internal.system.telegram.saveCustomerMessage, {
    threadId: conversation.threadId,
    prompt: body,
  });

  // Silent on purpose - the operator's reply is the response, and the
  // persistent keyboard already offers "done" and "main menu".
}

// ---------------------------------------------------------------- onboarding

async function startOnboarding(
  ctx: ActionCtx,
  integration: Integration,
  chatIdString: string,
  send: (text: string, replyMarkup?: unknown) => Promise<unknown>,
  setState: (args: {
    mode: "onboarding" | "chat" | "ticket_form" | "ticket_reply";
    onboardingStep?: string;
  }) => Promise<unknown>,
) {
  const widgetSettings = await ctx.runQuery(
    api.public.widgetSettings.getByOrganizationId,
    { organizationId: integration.organizationId },
  );

  await setState({ mode: "onboarding", onboardingStep: "contact" });

  await send(
    [
      widgetSettings?.greetMessage || "Hello! 👋",
      "",
      "Before we start, we need a way to reach you.",
      "",
      "Step 1 of 2 — tap the button below to share your phone number 📱",
    ].join("\n"),
    shareContactKeyboard,
  );
}

async function handleOnboarding({
  ctx,
  integration,
  chatIdString,
  chat,
  message,
  text,
  send,
  setState,
}: {
  ctx: ActionCtx;
  integration: Integration;
  chatIdString: string;
  chat: Chat;
  message: NonNullable<TelegramUpdate["message"]>;
  text: string;
  send: (text: string, replyMarkup?: unknown) => Promise<unknown>;
  setState: (args: {
    mode: "onboarding" | "chat" | "ticket_form" | "ticket_reply";
    onboardingStep?: string;
  }) => Promise<unknown>;
}) {
  const step = chat.onboardingStep ?? "contact";

  const saveProfile = (profile: Record<string, string | undefined>) =>
    ctx.runMutation(internal.system.telegram.updateProfile, {
      organizationId: integration.organizationId,
      chatId: chatIdString,
      profile,
    });

  if (step === "contact") {
    const phone = message.contact?.phone_number;

    if (!phone) {
      await send(
        "Please tap the “📱 Share my phone number” button below 👇",
        shareContactKeyboard,
      );
      return;
    }

    await saveProfile({ phone });
    await setState({ mode: "onboarding", onboardingStep: "email" });

    await send("Thanks! 📱", removeKeyboard);
    await send("Step 2 of 2 — what's your email address? 📧");
    return;
  }

  if (step === "email") {
    if (!EMAIL_PATTERN.test(text)) {
      await send("That doesn't look like an email address. Try again 📧");
      return;
    }

    await saveProfile({ email: text });
    await setState({ mode: "chat" });

    await send("All set ✅");
    await showMenu(ctx, integration, send);
    return;
  }

  // Unknown step - restart cleanly
  await startOnboarding(ctx, integration, chatIdString, send, setState);
}

async function showMenu(
  _ctx: ActionCtx,
  _integration: Integration,
  send: (text: string, replyMarkup?: unknown) => Promise<unknown>,
) {
  await send(MENU_TEXT, MAIN_MENU);
}

// ------------------------------------------------------------------ buttons

async function handleCallback({
  ctx,
  integration,
  chatIdString,
  chat,
  conversation,
  data,
  send,
  setState,
}: {
  ctx: ActionCtx;
  integration: Integration;
  chatIdString: string;
  chat: Chat;
  conversation: { conversationId: Id<"conversations">; threadId: string };
  data: string;
  send: (text: string, replyMarkup?: unknown) => Promise<unknown>;
  setState: (args: {
    mode: "onboarding" | "chat" | "ticket_form" | "ticket_reply";
    onboardingStep?: string;
    ticketDraft?: Chat["ticketDraft"];
    activeTicketId?: Id<"tickets">;
  }) => Promise<unknown>;
}) {
  const [scope, action, payload] = data.split(":");

  if (scope === "menu") {
    if (action === "home") {
      await setState({ mode: "chat" });
      await send("👌", removeKeyboard);
      await showMenu(ctx, integration, send);
      return;
    }

    if (action === "chat") {
      await setState({ mode: "chat" });
      await send(
        "Go ahead — type your message and our team will reply here 💬\nYou can send photos too 📷",
        CHAT_KEYBOARD,
      );
      return;
    }

    if (action === "newticket") {
      await setState({
        mode: "ticket_form",
        ticketDraft: { step: "category" },
      });

      await send(
        "What is this about?",
        inlineKeyboard(
          CATEGORIES.map((category) => [
            { text: category.label, callback_data: `cat:${category.value}` },
          ]).concat([[{ text: "✖️ Cancel", callback_data: "menu:home" }]]),
        ),
      );
      return;
    }

    if (action === "tickets") {
      await sendTicketList(ctx, chat, send);
      return;
    }
  }

  if (scope === "cat") {
    await setState({
      mode: "ticket_form",
      ticketDraft: { step: "subject", category: action },
    });

    await send("Give it a short title 📌");
    return;
  }

  if (scope === "ticket" && action === "open" && payload) {
    await openTicket(ctx, integration, chatIdString, chat, Number.parseInt(payload, 10), send, setState);
    return;
  }

  if (scope === "ticket" && action === "done" && payload) {
    const result = await ctx.runMutation(internal.system.telegram.resolveTicket, {
      ticketId: payload as Id<"tickets">,
      contactSessionId: chat.contactSessionId,
    });

    await setState({ mode: "chat" });

    await send(
      result
        ? `Ticket #${result.number} marked as done ✅ Thanks!`
        : "I couldn't find that ticket.",
      removeKeyboard,
    );
    await showMenu(ctx, integration, send);
    return;
  }

  if (scope === "chat" && action === "done") {
    await ctx.runMutation(internal.system.telegram.resolveConversation, {
      conversationId: conversation.conversationId,
    });

    await setState({ mode: "chat" });
    await send("Marked as done ✅ Message us any time.", removeKeyboard);
    await showMenu(ctx, integration, send);
    return;
  }

  if (scope === "draft" && action === "skipimage") {
    await finishTicket(ctx, integration, chatIdString, chat, send, setState);
    return;
  }

  await showMenu(ctx, integration, send);
}

// ------------------------------------------------------------------ tickets

async function sendTicketList(
  ctx: ActionCtx,
  chat: Chat,
  send: (text: string, replyMarkup?: unknown) => Promise<unknown>,
) {
  const tickets = await ctx.runQuery(internal.system.telegram.listTickets, {
    contactSessionId: chat.contactSessionId,
  });

  if (tickets.length === 0) {
    await send("You don't have any tickets yet.", MAIN_MENU);
    return;
  }

  await send(
    "Your tickets:",
    inlineKeyboard(
      tickets
        .map((ticket) => [
          {
            text: `#${ticket.number} ${STATUS_LABELS[ticket.status]} — ${ticket.subject}`.slice(
              0,
              60,
            ),
            callback_data: `ticket:open:${ticket.number}`,
          },
        ])
        .concat([[{ text: "🏠 Main menu", callback_data: "menu:home" }]]),
    ),
  );
}

async function openTicket(
  ctx: ActionCtx,
  integration: Integration,
  chatIdString: string,
  chat: Chat,
  number: number,
  send: (text: string, replyMarkup?: unknown) => Promise<unknown>,
  setState: (args: {
    mode: "onboarding" | "chat" | "ticket_form" | "ticket_reply";
    activeTicketId?: Id<"tickets">;
  }) => Promise<unknown>,
) {
  const ticket = await ctx.runQuery(
    internal.system.telegram.getTicketByNumber,
    {
      organizationId: integration.organizationId,
      contactSessionId: chat.contactSessionId,
      number,
    },
  );

  if (!ticket) {
    await send("I couldn't find that ticket.", removeKeyboard);
    await send(MENU_TEXT, MAIN_MENU);
    return;
  }

  await setState({ mode: "ticket_reply", activeTicketId: ticket._id });

  const history = ticket.messages
    .map(
      (entry) =>
        `${entry.authorType === "agent" ? "🙋" : "👤"} ${entry.authorName}: ${entry.body}`,
    )
    .join("\n\n");

  const isClosed = ticket.status === "closed";

  await send(
    [
      `🎫 #${ticket.number} — ${ticket.subject}`,
      STATUS_LABELS[ticket.status],
      "",
      history,
      "",
      isClosed
        ? "This ticket is closed."
        : "Anything you type now is added to this ticket.",
    ]
      .filter(Boolean)
      .join("\n"),
    isClosed ? removeKeyboard : TICKET_KEYBOARD,
  );

  if (isClosed) {
    await send(MENU_TEXT, MAIN_MENU);
  }
}

async function handleTicketForm({
  ctx,
  integration,
  chatIdString,
  chat,
  text,
  imageUrl,
  send,
  setState,
}: {
  ctx: ActionCtx;
  integration: Integration;
  chatIdString: string;
  chat: Chat;
  text: string;
  imageUrl: string | null;
  send: (text: string, replyMarkup?: unknown) => Promise<unknown>;
  setState: (args: {
    mode: "onboarding" | "chat" | "ticket_form" | "ticket_reply";
    ticketDraft?: Chat["ticketDraft"];
    activeTicketId?: Id<"tickets">;
  }) => Promise<unknown>;
}) {
  const draft = { ...chat.ticketDraft! };

  if (draft.step === "category") {
    await send(
      "Please pick a category using the buttons 👇",
      inlineKeyboard(
        CATEGORIES.map((category) => [
          { text: category.label, callback_data: `cat:${category.value}` },
        ]).concat([[{ text: "✖️ Cancel", callback_data: "menu:home" }]]),
      ),
    );
    return;
  }

  if (draft.step === "subject") {
    if (!text) {
      await send("Please send a short title for the issue 📌");
      return;
    }

    draft.subject = text.slice(0, 200);
    draft.step = "description";
    await setState({ mode: "ticket_form", ticketDraft: draft });

    await send(
      "Now describe the issue 📄\nWhat happened, and what did you expect?\n\nYou can attach a screenshot 📷",
    );
    return;
  }

  if (draft.step === "description") {
    if (!text && !imageUrl) {
      await send("Please describe the issue, or send a screenshot 📷");
      return;
    }

    draft.description = text;
    draft.imageUrl = imageUrl ?? undefined;
    draft.step = "confirm";
    await setState({ mode: "ticket_form", ticketDraft: draft });

    await send(
      [
        "Ready to send? 📨",
        "",
        `📌 ${draft.subject}`,
        `📄 ${draft.description || "(screenshot only)"}`,
        draft.imageUrl ? "📷 1 image attached" : "📷 no image",
        "",
        "Send another photo to add it, or tap Submit.",
      ].join("\n"),
      inlineKeyboard([
        [{ text: "✅ Submit ticket", callback_data: "draft:skipimage" }],
        [{ text: "✖️ Cancel", callback_data: "menu:home" }],
      ]),
    );
    return;
  }

  if (draft.step === "confirm") {
    // Extra photos while confirming just replace the attachment
    if (imageUrl) {
      draft.imageUrl = imageUrl;
      await setState({ mode: "ticket_form", ticketDraft: draft });
      await send(
        "Image updated 📷",
        inlineKeyboard([
          [{ text: "✅ Submit ticket", callback_data: "draft:skipimage" }],
          [{ text: "✖️ Cancel", callback_data: "menu:home" }],
        ]),
      );
      return;
    }

    await send(
      "Tap Submit when you're ready 👇",
      inlineKeyboard([
        [{ text: "✅ Submit ticket", callback_data: "draft:skipimage" }],
        [{ text: "✖️ Cancel", callback_data: "menu:home" }],
      ]),
    );
    return;
  }

  await setState({ mode: "chat" });
  await send("Something went wrong with that form.", MAIN_MENU);
}

async function finishTicket(
  ctx: ActionCtx,
  integration: Integration,
  chatIdString: string,
  chat: Chat,
  send: (text: string, replyMarkup?: unknown) => Promise<unknown>,
  setState: (args: {
    mode: "onboarding" | "chat" | "ticket_form" | "ticket_reply";
    ticketDraft?: Chat["ticketDraft"];
    activeTicketId?: Id<"tickets">;
  }) => Promise<unknown>,
) {
  const draft = chat.ticketDraft;

  if (!draft?.subject) {
    await setState({ mode: "chat" });
    await send("That ticket draft expired.", MAIN_MENU);
    return;
  }

  const description = [
    draft.description ?? "",
    draft.imageUrl ? `![Attached image](${draft.imageUrl})` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const created = await ctx.runMutation(internal.system.telegram.createTicket, {
    organizationId: integration.organizationId,
    contactSessionId: chat.contactSessionId,
    chatId: chatIdString,
    category: (draft.category ?? "other") as TicketCategory,
    subject: draft.subject,
    description: description || "(no description)",
  });

  // Land straight in reply mode so follow-ups attach to the new ticket
  await setState({ mode: "ticket_reply", activeTicketId: created.ticketId });

  await send(
    [
      `🎫 Ticket #${created.number} created!`,
      "",
      "Our team will reply right here.",
      "Anything you type now is added to this ticket.",
    ].join("\n"),
    inlineKeyboard([
      [
        {
          text: "✅ Mark as done",
          callback_data: `ticket:done:${created.ticketId}`,
        },
      ],
      [{ text: "🏠 Main menu", callback_data: "menu:home" }],
    ]),
  );
}

// -------------------------------------------------------------------- images

/**
 * Pulls a photo (or image document) out of Telegram and re-hosts it in Convex
 * storage, returning a URL the dashboard can render.
 */
async function storeIncomingImage(
  ctx: ActionCtx,
  integration: Integration,
  message: NonNullable<TelegramUpdate["message"]>,
): Promise<string | null> {
  // Telegram sends several sizes - the last one is the largest
  const photo = message.photo?.[message.photo.length - 1];
  const document =
    message.document?.mime_type?.startsWith("image/") === true
      ? message.document
      : undefined;

  const fileId = photo?.file_id ?? document?.file_id;

  if (!fileId) {
    return null;
  }

  try {
    const blob = await downloadFile(integration.botToken, fileId);

    if (!blob) {
      return null;
    }

    const storageId = await ctx.storage.store(blob);
    return await ctx.storage.getUrl(storageId);
  } catch (error) {
    console.error("Telegram image download failed", error);
    return null;
  }
}
