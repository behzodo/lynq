"use client";

import { XIcon } from "lucide-react";
import { AnnouncementFormSchema } from "../../schemas";

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

  return (
    <div className="flex min-h-40 items-center justify-center rounded-lg border bg-black/50 p-4">
      <div
        className="relative w-full max-w-xs rounded-2xl p-6 text-center shadow-xl"
        style={{ background: bgColor, color: textColor }}
      >
        {dismissible && (
          <XIcon
            className="absolute right-3 top-3 size-4 opacity-70"
            style={{ color: textColor }}
          />
        )}
        {title && <h2 className="mb-2 text-lg font-bold">{title}</h2>}
        <p className="text-sm opacity-90">{message || "Your message here"}</p>
        {cta && <div className="mt-4">{cta}</div>}
      </div>
    </div>
  );
};
