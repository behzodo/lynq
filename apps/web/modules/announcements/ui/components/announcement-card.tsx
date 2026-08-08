"use client";

import {
  ArrowUpRightIcon,
  MousePointerClickIcon,
  PanelBottomIcon,
  PanelTopIcon,
  PencilIcon,
  SquareIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { Doc } from "@workspace/backend/_generated/dataModel";
import { Button } from "@workspace/ui/components/button";
import { Switch } from "@workspace/ui/components/switch";
import { cn } from "@workspace/ui/lib/utils";

type Announcement = Doc<"announcements">;

interface Props {
  announcement: Announcement;
  onToggle: (announcement: Announcement, isActive: boolean) => void;
  onEdit: (announcement: Announcement) => void;
  onDelete: (announcement: Announcement) => void;
};

/**
 * Scaled-down sketch of what the visitor sees, in the announcement's own
 * colours - a banner pinned to an edge, or a popup floating in the middle.
 */
const Thumbnail = ({ announcement }: { announcement: Announcement }) => {
  const isBanner = announcement.type === "banner";

  const bar = (
    <div
      className="flex h-3 w-full items-center gap-0.5 px-1"
      style={{ background: announcement.bgColor, color: announcement.textColor }}
    >
      <div className="h-0.5 flex-1 rounded-full bg-current opacity-70" />
      {announcement.ctaLabel && (
        <div className="h-1.5 w-3 rounded-[2px] bg-current opacity-90" />
      )}
    </div>
  );

  return (
    <div className="relative size-16 shrink-0 overflow-hidden rounded-xl border bg-muted shadow-sm">
      {/* Fake page chrome behind the announcement */}
      <div className="absolute inset-0 flex flex-col justify-center gap-1 px-2">
        <div className="h-0.5 w-full rounded-full bg-foreground/10" />
        <div className="h-0.5 w-3/4 rounded-full bg-foreground/10" />
        <div className="h-0.5 w-5/6 rounded-full bg-foreground/10" />
      </div>

      {isBanner ? (
        <div
          className={cn(
            "absolute inset-x-0",
            announcement.position === "bottom" ? "bottom-0" : "top-0",
          )}
        >
          {bar}
        </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-black/25">
          <div
            className="flex h-7 w-11 flex-col items-center justify-center gap-1 rounded-md px-1 shadow"
            style={{
              background: announcement.bgColor,
              color: announcement.textColor,
            }}
          >
            <div className="h-0.5 w-6 rounded-full bg-current opacity-80" />
            <div className="h-0.5 w-8 rounded-full bg-current opacity-40" />
            {announcement.ctaLabel && (
              <div className="h-1.5 w-5 rounded-[2px] bg-current opacity-90" />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const AnnouncementCard = ({
  announcement,
  onToggle,
  onEdit,
  onDelete,
}: Props) => {
  const isBanner = announcement.type === "banner";

  const PositionIcon = isBanner
    ? announcement.position === "bottom"
      ? PanelBottomIcon
      : PanelTopIcon
    : SquareIcon;

  const positionLabel = isBanner
    ? `Banner · ${announcement.position}`
    : "Popup · centered";

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border bg-background p-4 transition-all",
        "hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-md",
        !announcement.isActive && "opacity-70 hover:opacity-100",
      )}
    >
      {/* Left rail marks a live announcement without adding another badge */}
      <span
        className={cn(
          "absolute inset-y-0 left-0 w-0.5",
          announcement.isActive ? "bg-foreground" : "bg-transparent",
        )}
      />

      <div className="flex items-start gap-4 pl-1.5">
        <Thumbnail announcement={announcement} />

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="truncate font-semibold">{announcement.title}</p>
            <span className="flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground capitalize">
              <PositionIcon className="size-3" />
              {positionLabel}
            </span>
            {announcement.isActive ? (
              <span className="flex items-center gap-1.5 rounded-full bg-foreground px-2 py-0.5 font-medium text-[11px] text-background">
                <span className="size-1.5 rounded-full bg-background" />
                Live
              </span>
            ) : (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                Paused
              </span>
            )}
          </div>

          <p className="line-clamp-2 text-muted-foreground text-sm">
            {announcement.message}
          </p>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-0.5 text-[11px] text-muted-foreground">
            {announcement.ctaLabel && announcement.ctaUrl ? (
              <a
                className="flex items-center gap-1 hover:text-foreground hover:underline"
                href={announcement.ctaUrl}
                rel="noopener noreferrer"
                target="_blank"
              >
                <MousePointerClickIcon className="size-3" />
                {announcement.ctaLabel}
                <ArrowUpRightIcon className="size-3" />
              </a>
            ) : (
              <span className="flex items-center gap-1 opacity-60">
                <MousePointerClickIcon className="size-3" />
                No button
              </span>
            )}

            <span className="flex items-center gap-1">
              <XIcon className="size-3" />
              {announcement.dismissible ? "Dismissible" : "Always shown"}
            </span>

            <span className="flex items-center gap-1.5">
              <span
                className="size-3 rounded-full border"
                style={{ background: announcement.bgColor }}
              />
              <span className="font-mono uppercase">
                {announcement.bgColor}
              </span>
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Switch
            checked={announcement.isActive}
            onCheckedChange={(checked) => onToggle(announcement, checked)}
          />
          {/* Actions stay quiet until the row is hovered or focused */}
          <div className="flex opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
            <Button
              onClick={() => onEdit(announcement)}
              size="icon"
              title="Edit"
              variant="ghost"
            >
              <PencilIcon className="size-4" />
            </Button>
            <Button
              onClick={() => onDelete(announcement)}
              size="icon"
              title="Delete"
              variant="ghost"
            >
              <Trash2Icon className="size-4 text-destructive" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
