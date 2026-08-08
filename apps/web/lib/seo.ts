/**
 * One source of truth for the strings search engines and social cards use,
 * so titles never drift between the layout, OG image and manifest.
 */
export const SITE = {
  name: "Lynq",
  tagline: "Customer support that lives on your site",
  description:
    "Lynq is a customer support platform: a live chat widget, ticketing with a kanban board, announcements, surveys and a Telegram bot - all from one dashboard.",
  url: process.env.NEXT_PUBLIC_APP_URL || "https://app.korvians.online",
  locale: "en_US",
  themeColor: "#171717",
} as const;

export const KEYWORDS = [
  "customer support",
  "live chat widget",
  "help desk",
  "ticketing system",
  "support tickets",
  "kanban board",
  "announcements",
  "banners",
  "surveys",
  "NPS",
  "Telegram bot",
  "customer feedback",
];
