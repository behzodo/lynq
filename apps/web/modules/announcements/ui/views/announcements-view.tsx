"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import {
  Loader2Icon,
  MegaphoneIcon,
  PencilIcon,
  PlusIcon,
  SquareIcon,
  Trash2Icon,
} from "lucide-react";
import { api } from "@workspace/backend/_generated/api";
import { Doc } from "@workspace/backend/_generated/dataModel";
import { Badge } from "@workspace/ui/components/badge";
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
import { Card, CardContent } from "@workspace/ui/components/card";
import { Switch } from "@workspace/ui/components/switch";
import { AnnouncementFormDialog } from "../components/announcement-form-dialog";

type Announcement = Doc<"announcements">;

export const AnnouncementsView = () => {
  const announcements = useQuery(api.private.announcements.getMany);
  const setActive = useMutation(api.private.announcements.setActive);
  const remove = useMutation(api.private.announcements.remove);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Announcement | null>(null);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (announcement: Announcement) => {
    setEditing(announcement);
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

  if (announcements === undefined) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-y-2 bg-muted p-8">
        <Loader2Icon className="animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading announcements...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted p-8">
      <div className="mx-auto w-full max-w-screen-md">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-2xl md:text-4xl">Announcements</h1>
            <p className="text-muted-foreground">
              Show banners and popups on your website
            </p>
          </div>
          <Button onClick={openCreate}>
            <PlusIcon className="size-4" />
            New
          </Button>
        </div>

        <div className="mt-8 space-y-3">
          {announcements.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center gap-y-3 py-12 text-center">
                <MegaphoneIcon className="size-8 text-muted-foreground" />
                <div className="space-y-1">
                  <p className="font-medium">No announcements yet</p>
                  <p className="text-sm text-muted-foreground">
                    Create a banner or popup to greet your visitors
                  </p>
                </div>
                <Button onClick={openCreate} variant="outline">
                  <PlusIcon className="size-4" />
                  Create one
                </Button>
              </CardContent>
            </Card>
          )}

          {announcements.map((announcement) => (
            <Card key={announcement._id}>
              <CardContent className="flex items-center gap-4 py-4">
                <div
                  className="flex size-10 shrink-0 items-center justify-center rounded-md"
                  style={{
                    background: announcement.bgColor,
                    color: announcement.textColor,
                  }}
                >
                  {announcement.type === "banner" ? (
                    <SquareIcon className="size-4" />
                  ) : (
                    <MegaphoneIcon className="size-4" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium">{announcement.title}</p>
                    <Badge variant="secondary" className="capitalize">
                      {announcement.type}
                    </Badge>
                    {announcement.isActive ? (
                      <Badge className="bg-green-600 hover:bg-green-600">
                        Live
                      </Badge>
                    ) : (
                      <Badge variant="outline">Paused</Badge>
                    )}
                  </div>
                  <p className="truncate text-sm text-muted-foreground">
                    {announcement.message}
                  </p>
                </div>

                <Switch
                  checked={announcement.isActive}
                  onCheckedChange={(checked) => onToggle(announcement, checked)}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => openEdit(announcement)}
                >
                  <PencilIcon className="size-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setPendingDelete(announcement)}
                >
                  <Trash2Icon className="size-4 text-destructive" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <AnnouncementFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        announcement={editing}
      />

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
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
