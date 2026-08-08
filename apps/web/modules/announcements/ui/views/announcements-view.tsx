"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import {
  MegaphoneIcon,
  PlusIcon,
  RadioIcon,
  SquareIcon,
} from "lucide-react";
import { api } from "@workspace/backend/_generated/api";
import { Doc } from "@workspace/backend/_generated/dataModel";
import { Button } from "@workspace/ui/components/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";
import { AnnouncementCard } from "../components/announcement-card";
import { AnnouncementFormDialog } from "../components/announcement-form-dialog";

type Announcement = Doc<"announcements">;
type Filter = "all" | "live" | "paused";

const StatTile = ({
  icon: Icon,
  label,
  value,
  hint,
  invert,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
  invert?: boolean;
}) => (
  <div
    className={cn(
      "rounded-xl border p-4",
      invert
        ? "border-foreground bg-foreground text-background"
        : "bg-background",
    )}
  >
    <div className="flex items-center gap-2">
      <Icon className={cn("size-4", !invert && "text-muted-foreground")} />
      <span
        className={cn(
          "text-xs",
          invert ? "text-background/70" : "text-muted-foreground",
        )}
      >
        {label}
      </span>
    </div>
    <p className="mt-2 font-semibold text-3xl tabular-nums tracking-tight">
      {value}
    </p>
    {hint && (
      <p
        className={cn(
          "mt-0.5 text-[11px]",
          invert ? "text-background/60" : "text-muted-foreground",
        )}
      >
        {hint}
      </p>
    )}
  </div>
);

export const AnnouncementsView = () => {
  const announcements = useQuery(api.private.announcements.getMany);
  const setActive = useMutation(api.private.announcements.setActive);
  const remove = useMutation(api.private.announcements.remove);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Announcement | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  const stats = useMemo(() => {
    const list = announcements ?? [];
    const live = list.filter((item) => item.isActive);

    return {
      total: list.length,
      live: live.length,
      banners: list.filter((item) => item.type === "banner").length,
      popups: list.filter((item) => item.type === "popup").length,
      // Only one popup renders at a time, so flag a stack the visitor won't see
      livePopups: live.filter((item) => item.type === "popup").length,
    };
  }, [announcements]);

  const visible = useMemo(() => {
    const list = announcements ?? [];

    if (filter === "live") return list.filter((item) => item.isActive);
    if (filter === "paused") return list.filter((item) => !item.isActive);
    return list;
  }, [announcements, filter]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const onToggle = async (announcement: Announcement, isActive: boolean) => {
    try {
      await setActive({ announcementId: announcement._id, isActive });
    } catch (error) {
      console.error(error);
      toast.error("Could not update");
    }
  };

  const onDelete = async () => {
    if (!pendingDelete) {
      return;
    }

    try {
      await remove({ announcementId: pendingDelete._id });
      toast.success("Announcement deleted");
    } catch (error) {
      console.error(error);
      toast.error("Could not delete");
    } finally {
      setPendingDelete(null);
    }
  };

  const filters: { value: Filter; label: string; count: number }[] = [
    { value: "all", label: "All", count: stats.total },
    { value: "live", label: "Live", count: stats.live },
    { value: "paused", label: "Paused", count: stats.total - stats.live },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-muted p-8">
      <div className="mx-auto w-full max-w-screen-md">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5">
            <h1 className="font-semibold text-2xl tracking-tight md:text-4xl">
              Announcements
            </h1>
            <p className="text-muted-foreground">
              Show banners and popups on your website
            </p>
          </div>
          <Button onClick={openCreate} size="lg">
            <PlusIcon className="size-4" />
            New announcement
          </Button>
        </div>

        {announcements === undefined ? (
          <div className="mt-8 space-y-6">
            <div className="grid gap-3 sm:grid-cols-3">
              {[0, 1, 2].map((index) => (
                <Skeleton className="h-28 rounded-xl" key={index} />
              ))}
            </div>
            <div className="space-y-3">
              {[0, 1, 2].map((index) => (
                <Skeleton className="h-28 rounded-xl" key={index} />
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <StatTile
                hint={`${stats.total} total`}
                icon={RadioIcon}
                invert
                label="Live now"
                value={String(stats.live)}
              />
              <StatTile
                hint="top or bottom bar"
                icon={SquareIcon}
                label="Banners"
                value={String(stats.banners)}
              />
              <StatTile
                hint="centered modal"
                icon={MegaphoneIcon}
                label="Popups"
                value={String(stats.popups)}
              />
            </div>

            {stats.livePopups > 1 && (
              <p className="mt-3 rounded-lg border border-dashed bg-background/60 px-3 py-2 text-muted-foreground text-xs">
                {stats.livePopups} popups are live, but visitors only ever see
                one at a time. Pause the rest so the right one shows.
              </p>
            )}

            {stats.total > 0 && (
              <div className="mt-8 flex items-center gap-1 rounded-lg border bg-background p-1">
                {filters.map((option) => (
                  <button
                    className={cn(
                      "flex-1 rounded-md px-3 py-1.5 font-medium text-sm transition-colors",
                      filter === option.value
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:bg-muted",
                    )}
                    key={option.value}
                    onClick={() => setFilter(option.value)}
                    type="button"
                  >
                    {option.label}
                    <span className="ml-1.5 opacity-60 tabular-nums">
                      {option.count}
                    </span>
                  </button>
                ))}
              </div>
            )}

            <div className="mt-4 space-y-3">
              {stats.total === 0 && (
                <div className="rounded-xl border border-dashed bg-background/50 px-6 py-16 text-center">
                  <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-foreground text-background">
                    <MegaphoneIcon className="size-5" />
                  </div>
                  <p className="mt-4 font-semibold">No announcements yet</p>
                  <p className="mx-auto mt-1 max-w-sm text-muted-foreground text-sm">
                    Ship a bar across the top of your site, or a popup in the
                    middle - with your own colours and a button.
                  </p>
                  <Button className="mt-5" onClick={openCreate} size="lg">
                    <PlusIcon className="size-4" />
                    Create your first announcement
                  </Button>
                </div>
              )}

              {stats.total > 0 && visible.length === 0 && (
                <div className="rounded-xl border border-dashed bg-background/50 px-6 py-12 text-center">
                  <p className="text-muted-foreground text-sm">
                    No {filter} announcements.
                  </p>
                </div>
              )}

              {visible.map((announcement) => (
                <AnnouncementCard
                  announcement={announcement}
                  key={announcement._id}
                  onDelete={setPendingDelete}
                  onEdit={(item) => {
                    setEditing(item);
                    setFormOpen(true);
                  }}
                  onToggle={onToggle}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <AnnouncementFormDialog
        announcement={editing}
        onOpenChange={setFormOpen}
        open={formOpen}
      />

      <AlertDialog
        onOpenChange={(open) => !open && setPendingDelete(null)}
        open={pendingDelete !== null}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete announcement?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{pendingDelete?.title}&quot; will be removed from your
              website immediately. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
