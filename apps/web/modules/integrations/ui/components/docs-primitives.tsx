"use client";

import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { CheckIcon, CopyIcon, InfoIcon, TriangleAlertIcon } from "lucide-react";
import { useEffect, useState } from "react";

/** A documentation section with an anchor, so the on-page nav can link to it. */
export const DocsSection = ({
  id,
  eyebrow,
  title,
  description,
  children,
}: {
  id: string;
  eyebrow?: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) => (
  // scroll-mt keeps the heading clear of the sticky header when linked to
  <section className="scroll-mt-8" id={id}>
    <div className="space-y-1.5">
      {eyebrow && (
        <p className="font-medium font-mono text-[11px] text-primary uppercase tracking-widest">
          {eyebrow}
        </p>
      )}
      <h2 className="font-semibold text-xl tracking-tight">{title}</h2>
      {description && (
        <p className="max-w-2xl text-muted-foreground text-sm leading-relaxed">
          {description}
        </p>
      )}
    </div>
    <div className="mt-5">{children}</div>
  </section>
);

/** Numbered step with a connecting rail, like a walkthrough in API docs. */
export const Step = ({
  number,
  title,
  children,
  isLast = false,
}: {
  number: number;
  title: string;
  children?: React.ReactNode;
  isLast?: boolean;
}) => (
  <div className="relative pl-11">
    {!isLast && (
      <span
        aria-hidden
        className="absolute top-8 bottom-0 left-[15px] w-px bg-border"
      />
    )}
    <span className="absolute top-0 left-0 flex size-8 items-center justify-center rounded-full border bg-background font-medium font-mono text-[13px]">
      {number}
    </span>
    <div className="pb-8">
      <h3 className="pt-1.5 font-medium text-sm">{title}</h3>
      {children && <div className="mt-3 space-y-3">{children}</div>}
    </div>
  </div>
);

export const Callout = ({
  variant = "info",
  title,
  children,
}: {
  variant?: "info" | "warning";
  title?: string;
  children: React.ReactNode;
}) => {
  const Icon = variant === "warning" ? TriangleAlertIcon : InfoIcon;

  return (
    <div
      className={cn(
        "flex gap-3 rounded-lg border p-3.5 text-sm",
        variant === "warning"
          ? "border-amber-500/30 bg-amber-500/5"
          : "border-primary/20 bg-primary/5",
      )}
    >
      <Icon
        className={cn(
          "mt-0.5 size-4 shrink-0",
          variant === "warning" ? "text-amber-600" : "text-primary",
        )}
      />
      <div className="space-y-1">
        {title && <p className="font-medium">{title}</p>}
        <div className="text-muted-foreground leading-relaxed">{children}</div>
      </div>
    </div>
  );
};

/** Read-only value with a copy button - organization ids, endpoints, keys. */
export const CopyField = ({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;

    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      // Clipboard blocked; the value is selectable either way
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium text-sm">{label}</p>
        {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
      </div>
      <div className="flex items-center gap-2 rounded-lg border bg-muted/40 py-1.5 pr-1.5 pl-3">
        <code className="flex-1 truncate font-mono text-[12.5px]">
          {value || "—"}
        </code>
        <Button
          aria-label={`Copy ${label}`}
          className="h-7 shrink-0 gap-1.5 px-2 text-xs"
          disabled={!value}
          onClick={handleCopy}
          size="sm"
          variant="outline"
        >
          {copied ? (
            <>
              <CheckIcon className="size-3" />
              Copied
            </>
          ) : (
            <>
              <CopyIcon className="size-3" />
              Copy
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
