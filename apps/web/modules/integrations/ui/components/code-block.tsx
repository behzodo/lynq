"use client";

import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { CheckIcon, CopyIcon } from "lucide-react";
import { useEffect, useState } from "react";

interface CodeBlockProps {
  code: string;
  /** Shown in the header strip, e.g. "index.html" or "Terminal". */
  label?: string;
  className?: string;
}

export const CodeBlock = ({ code, label, className }: CodeBlockProps) => {
  const [copied, setCopied] = useState(false);

  // Reset the tick without leaking a timer if the component unmounts first
  useEffect(() => {
    if (!copied) return;

    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      // Clipboard blocked; the code is selectable either way
    }
  };

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 border-zinc-800 border-b bg-zinc-900/60 px-3 py-1.5">
        <span className="font-mono text-[11px] text-zinc-400 uppercase tracking-wider">
          {label ?? "Code"}
        </span>
        <Button
          aria-label="Copy code"
          className="h-6 gap-1.5 px-2 text-[11px] text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
          onClick={handleCopy}
          size="sm"
          variant="ghost"
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
      {/* Horizontal scroll rather than wrapping: a broken URL is unusable */}
      <pre className="overflow-x-auto p-3 text-[12.5px] leading-relaxed">
        <code className="font-mono text-zinc-100">{code}</code>
      </pre>
    </div>
  );
};
