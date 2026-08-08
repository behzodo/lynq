import { cn } from "@workspace/ui/lib/utils";

export const WidgetHeader = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <header
      className={cn(
        "relative isolate overflow-hidden bg-primary p-4 text-primary-foreground",
        className,
      )}
    >
      {/* Generated liquid-gradient artwork */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-30 bg-[url('/widget-header-bg.webp')] bg-cover bg-center"
      />

      {/* Brand tint + scrim: keeps white text readable over the artwork */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-20 bg-gradient-to-br from-primary/60 via-primary/40 to-black/75"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-20 bg-gradient-to-t from-black/30 via-black/10 to-transparent"
      />

      {/* Fine grid texture */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.12] [background-image:linear-gradient(to_right,rgba(255,255,255,0.6)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.6)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_at_top,black,transparent_75%)]"
      />

      {/* Glossy top highlight */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-white/30"
      />

      {children}
    </header>
  );
};
