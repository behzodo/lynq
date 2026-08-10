import { z } from "zod";
import { ALL_DEPARTMENTS } from "@/modules/departments/constants";

/** Form-only sentinel for "no media" - mapped to undefined on save */
export const NO_MEDIA = "none";

export const MEDIA_TYPES = [
  { value: NO_MEDIA, label: "No media" },
  { value: "image", label: "Image" },
  { value: "video", label: "Video file" },
  { value: "youtube", label: "YouTube" },
] as const;

/**
 * Mirrors youtubeVideoId() in apps/embed - a link the embed can't parse would
 * render as a popup with a blank hole where the video should be, so it's
 * rejected at authoring time instead.
 */
const VIDEO_ID = /^[\w-]{11}$/;

export function youtubeVideoId(url: string): string | null {
  const trimmed = url.trim();

  if (VIDEO_ID.test(trimmed)) {
    return trimmed;
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  const host = parsed.hostname.replace(/^www\./, "");

  if (host === "youtu.be") {
    const id = parsed.pathname.slice(1).split("/")[0] ?? "";
    return VIDEO_ID.test(id) ? id : null;
  }

  if (!["youtube.com", "m.youtube.com", "youtube-nocookie.com"].includes(host)) {
    return null;
  }

  const fromQuery = parsed.searchParams.get("v");
  if (fromQuery && VIDEO_ID.test(fromQuery)) {
    return fromQuery;
  }

  const match = parsed.pathname.match(/^\/(?:embed|shorts|live|v)\/([\w-]{11})/);
  return match?.[1] ?? null;
}

export function isYoutubeUrl(url: string): boolean {
  return youtubeVideoId(url) !== null;
}

export const announcementSchema = z.object({
  // ALL_DEPARTMENTS ("all") means organization-wide; mapped to undefined on save
  departmentId: z.string().optional(),
  type: z.enum(["banner", "popup"]),
  title: z.string().min(1, "Title is required"),
  message: z.string().min(1, "Message is required"),
  ctaLabel: z.string().optional(),
  ctaUrl: z.string().optional(),
  mediaType: z.enum([NO_MEDIA, "image", "video", "youtube"]),
  mediaUrl: z.string().optional(),
  bgColor: z.string().min(1),
  textColor: z.string().min(1),
  position: z.enum(["top", "bottom"]),
  dismissible: z.boolean(),
  isActive: z.boolean(),
}).refine(
  (values) => !values.ctaLabel || !!values.ctaUrl,
  { message: "Add a link for the button", path: ["ctaUrl"] },
).refine(
  (values) => values.mediaType === NO_MEDIA || !!values.mediaUrl?.trim(),
  { message: "Add a link to the media", path: ["mediaUrl"] },
).refine(
  (values) =>
    values.mediaType !== "youtube" || isYoutubeUrl(values.mediaUrl ?? ""),
  { message: "That doesn't look like a YouTube link", path: ["mediaUrl"] },
);

export type AnnouncementFormSchema = z.infer<typeof announcementSchema>;

export const DEFAULT_ANNOUNCEMENT: AnnouncementFormSchema = {
  departmentId: ALL_DEPARTMENTS,
  type: "banner",
  title: "",
  message: "",
  ctaLabel: "",
  ctaUrl: "",
  mediaType: NO_MEDIA,
  mediaUrl: "",
  bgColor: "#171717",
  textColor: "#ffffff",
  position: "top",
  dismissible: true,
  isActive: true,
};

export const COLOR_PRESETS = [
  { name: "Black", bgColor: "#171717", textColor: "#ffffff" },
  { name: "Dark", bgColor: "#111827", textColor: "#ffffff" },
  { name: "Green", bgColor: "#16a34a", textColor: "#ffffff" },
  { name: "Amber", bgColor: "#f59e0b", textColor: "#111827" },
  { name: "Red", bgColor: "#dc2626", textColor: "#ffffff" },
  { name: "Light", bgColor: "#f3f4f6", textColor: "#111827" },
];
