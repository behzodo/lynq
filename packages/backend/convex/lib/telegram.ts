/**
 * Thin wrapper over the Telegram Bot HTTP API.
 * Only the handful of methods this integration needs.
 */

const API_BASE = "https://api.telegram.org";

type TelegramResponse<T> = {
  ok: boolean;
  result?: T;
  description?: string;
};

export type InlineButton = { text: string; callback_data: string };

/** Rows of inline buttons attached under a message. */
export function inlineKeyboard(rows: InlineButton[][]) {
  return { inline_keyboard: rows };
}

/** One-tap button that shares the user's verified phone number. */
export const shareContactKeyboard = {
  keyboard: [[{ text: "📱 Share my phone number", request_contact: true }]],
  resize_keyboard: true,
  one_time_keyboard: true,
};

export const removeKeyboard = { remove_keyboard: true };

/**
 * Buttons that live under the text input instead of inside the chat, so the
 * same actions stay available without posting a message every turn.
 */
export function persistentKeyboard(rows: string[][]) {
  return {
    keyboard: rows.map((row) => row.map((text) => ({ text }))),
    resize_keyboard: true,
    is_persistent: true,
  };
}

async function callTelegram<T>(
  botToken: string,
  method: string,
  payload?: Record<string, unknown>,
): Promise<TelegramResponse<T>> {
  const response = await fetch(`${API_BASE}/bot${botToken}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload ?? {}),
  });

  return (await response.json()) as TelegramResponse<T>;
}

export type TelegramBotInfo = {
  id: number;
  username: string;
  first_name: string;
};

export async function getMe(botToken: string) {
  return await callTelegram<TelegramBotInfo>(botToken, "getMe");
}

export async function setWebhook(
  botToken: string,
  url: string,
  secretToken: string,
) {
  return await callTelegram(botToken, "setWebhook", {
    url,
    secret_token: secretToken,
    // callback_query is required for the inline button flow
    allowed_updates: ["message", "callback_query"],
    drop_pending_updates: true,
  });
}

export async function deleteWebhook(botToken: string) {
  return await callTelegram(botToken, "deleteWebhook", {
    drop_pending_updates: true,
  });
}

const TELEGRAM_MAX_MESSAGE_LENGTH = 4096;

export async function sendMessage(
  botToken: string,
  chatId: string,
  text: string,
  replyMarkup?: unknown,
) {
  return await callTelegram(botToken, "sendMessage", {
    chat_id: chatId,
    text: text.slice(0, TELEGRAM_MAX_MESSAGE_LENGTH),
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
  });
}

export async function sendChatAction(botToken: string, chatId: string) {
  return await callTelegram(botToken, "sendChatAction", {
    chat_id: chatId,
    action: "typing",
  });
}

/** Stops the spinner on a tapped inline button. */
export async function answerCallbackQuery(
  botToken: string,
  callbackQueryId: string,
  text?: string,
) {
  return await callTelegram(botToken, "answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    ...(text ? { text } : {}),
  });
}

/** Removes the buttons from a message once it has been acted on. */
export async function editMessageReplyMarkup(
  botToken: string,
  chatId: string,
  messageId: number,
) {
  return await callTelegram(botToken, "editMessageReplyMarkup", {
    chat_id: chatId,
    message_id: messageId,
    reply_markup: { inline_keyboard: [] },
  });
}

/**
 * Downloads a Telegram-hosted file. Two hops: resolve the path, then fetch the
 * bytes from the file CDN.
 */
export async function downloadFile(
  botToken: string,
  fileId: string,
): Promise<Blob | null> {
  const file = await callTelegram<{ file_path?: string }>(
    botToken,
    "getFile",
    { file_id: fileId },
  );

  if (!file.ok || !file.result?.file_path) {
    return null;
  }

  const response = await fetch(
    `${API_BASE}/file/bot${botToken}/${file.result.file_path}`,
  );

  if (!response.ok) {
    return null;
  }

  return await response.blob();
}
