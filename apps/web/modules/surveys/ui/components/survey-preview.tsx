"use client";

import { XIcon } from "lucide-react";
import { SurveyFormSchema } from "../../schemas";

interface Props {
  values: SurveyFormSchema;
};

/**
 * Mirrors the card apps/embed renders on the customer's site.
 */
export const SurveyPreview = ({ values }: Props) => {
  const { bgColor, textColor, type } = values;

  const scores =
    type === "nps"
      ? Array.from({ length: 11 }, (_, index) => String(index))
      : type === "rating"
        ? ["★", "★", "★", "★", "★"]
        : [];

  const alignment =
    values.position === "center"
      ? "justify-center"
      : values.position === "bottom-left"
        ? "justify-start"
        : "justify-end";

  return (
    <div
      className={`flex ${alignment} rounded-lg border bg-[repeating-linear-gradient(45deg,var(--muted),var(--muted)_10px,transparent_10px,transparent_20px)] p-4`}
    >
      <div
        className="relative w-full max-w-[280px] rounded-2xl p-5 shadow-lg"
        style={{ background: bgColor, color: textColor }}
      >
        <XIcon
          className="absolute right-2.5 top-2.5 size-3.5 opacity-70"
          style={{ color: textColor }}
        />

        {values.title && (
          <h3 className="mr-6 mb-1.5 text-sm font-bold leading-tight">
            {values.title}
          </h3>
        )}
        <p className="text-xs leading-relaxed opacity-90">
          {values.question || "Your question here"}
        </p>

        {scores.length > 0 && (
          <div className="my-3 flex flex-wrap justify-center gap-1.5">
            {scores.map((label, index) => (
              <span
                key={index}
                className="flex h-7 min-w-7 items-center justify-center rounded-md border text-xs font-semibold opacity-75"
                style={{ borderColor: `${textColor}59` }}
              >
                {label}
              </span>
            ))}
          </div>
        )}

        {type === "nps" && (
          <div className="flex justify-between text-[10px] opacity-70">
            <span>Not likely</span>
            <span>Very likely</span>
          </div>
        )}

        <div
          className="mt-3 rounded-md border px-2 py-1.5 text-[11px] opacity-60"
          style={{ borderColor: `${textColor}4d` }}
        >
          {values.commentLabel || "Tell us more (optional)"}
        </div>

        <div
          className="mt-3 rounded-lg py-1.5 text-center text-xs font-semibold"
          style={{ background: textColor, color: bgColor }}
        >
          Submit
        </div>
      </div>
    </div>
  );
};
