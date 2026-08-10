"use client";

import { PlayIcon, XIcon } from "lucide-react";
import {
  AnnouncementFormSchema,
  NO_MEDIA,
  youtubeVideoId,
} from "../../schemas";

/**
 * The media block as the embed draws it: full-bleed above the copy, 16:9.
 * Nothing plays here - the dashboard only needs to show the framing.
 */
const PreviewMedia = ({ values }: Props) => {
  const { mediaType, mediaUrl } = values;

  if (mediaType === NO_MEDIA || !mediaUrl?.trim()) {
    return null;
  }

  const shell = "relative -mx-6 -mt-6 mb-4 aspect-video overflow-hidden rounded-t-2xl bg-black/25";

  if (mediaType === "youtube") {
    const videoId = youtubeVideoId(mediaUrl);

    if (!videoId) {
      return null;
    }

    return (
      <div className={shell}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt=""
          className="size-full object-cover"
          src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="flex h-8 w-12 items-center justify-center rounded-lg bg-[#f00] shadow-lg">
            <PlayIcon className="size-4 fill-white text-white" />
          </span>
        </div>
      </div>
    );
  }

  if (mediaType === "video") {
    return (
      <div className={shell}>
        {/* No autoplay: the poster frame is all the preview needs */}
        <video className="size-full object-cover" muted preload="metadata" src={mediaUrl} />
      </div>
    );
  }

  return (
    <div className={shell}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img alt="" className="size-full object-cover" src={mediaUrl} />
    </div>
  );
};

interface Props {
  values: AnnouncementFormSchema;
};

/**
 * Mirrors what apps/embed renders on the customer's site, scaled into a box.
 */
export const AnnouncementPreview = ({ values }: Props) => {
  const { bgColor, textColor, title, message, ctaLabel, dismissible } = values;

  const cta = ctaLabel ? (
    <span
      className="inline-block shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold"
      style={{ background: textColor, color: bgColor }}
    >
      {ctaLabel}
    </span>
  ) : null;

  const dismiss = dismissible ? (
    <XIcon className="size-4 shrink-0 opacity-70" style={{ color: textColor }} />
  ) : null;

  if (values.type === "banner") {
    return (
      <div className="overflow-hidden rounded-lg border bg-[repeating-linear-gradient(45deg,var(--muted),var(--muted)_10px,transparent_10px,transparent_20px)]">
        <div
          className={
            values.position === "bottom"
              ? "flex min-h-28 flex-col justify-end"
              : "flex min-h-28 flex-col justify-start"
          }
        >
          <div
            className="flex items-center justify-center gap-3 px-4 py-3 text-sm"
            style={{ background: bgColor, color: textColor }}
          >
            <div className="flex min-w-0 flex-wrap items-baseline gap-2">
              {title && <strong>{title}</strong>}
              <span className="opacity-90">{message || "Your message here"}</span>
            </div>
            {cta}
            {dismiss}
          </div>
        </div>
      </div>
    );
  }

  const hasMedia =
    values.mediaType !== NO_MEDIA && !!values.mediaUrl?.trim();

  return (
    <div className="flex min-h-40 items-center justify-center rounded-lg border bg-black/50 p-4">
      <div
        className="relative w-full max-w-xs overflow-hidden rounded-2xl p-6 text-left shadow-xl"
        style={{ background: bgColor, color: textColor }}
      >
        <PreviewMedia values={values} />
        {dismissible && (
          <span
            className={
              hasMedia
                ? "absolute right-3 top-3 flex size-6 items-center justify-center rounded-full bg-black/45 text-white"
                : "absolute right-3 top-3 flex size-6 items-center justify-center rounded-full opacity-55"
            }
            style={hasMedia ? undefined : { color: textColor }}
          >
            <XIcon className="size-3.5" />
          </span>
        )}
        {title && (
          <h2 className="mb-2 pr-7 text-lg font-semibold leading-tight tracking-tight">
            {title}
          </h2>
        )}
        <p className="text-sm leading-relaxed opacity-70">
          {message || "Your message here"}
        </p>
        {cta && <div className="mt-4">{cta}</div>}
      </div>
    </div>
  );
};
