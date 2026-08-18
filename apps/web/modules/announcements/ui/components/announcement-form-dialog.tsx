"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useMutation } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { Doc } from "@workspace/backend/_generated/dataModel";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Switch } from "@workspace/ui/components/switch";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  announcementSchema,
  AnnouncementFormSchema,
  COLOR_PRESETS,
  DEFAULT_ANNOUNCEMENT,
} from "../../schemas";
import { AnnouncementPreview } from "./announcement-preview";
import { DepartmentField } from "@/modules/departments/ui/components/department-field";
import {
  toDepartmentArg,
  toDepartmentField,
} from "@/modules/departments/constants";
import { PlatformsField } from "@/modules/platforms/ui/components/platforms-field";
import {
  toPlatformsArg,
  toPlatformsField,
} from "@/modules/platforms/constants";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present when editing, absent when creating */
  announcement?: Doc<"announcements"> | null;
};

export const AnnouncementFormDialog = ({
  open,
  onOpenChange,
  announcement,
}: Props) => {
  const create = useMutation(api.private.announcements.create);
  const update = useMutation(api.private.announcements.update);

  const form = useForm<AnnouncementFormSchema>({
    resolver: zodResolver(announcementSchema),
    defaultValues: DEFAULT_ANNOUNCEMENT,
  });

  // Re-seed the form each time the dialog opens for a different record
  useEffect(() => {
    if (!open) {
      return;
    }

    form.reset(
      announcement
        ? {
            departmentId: toDepartmentField(announcement.departmentId),
            platforms: toPlatformsField(announcement.platforms),
            type: announcement.type,
            title: announcement.title,
            message: announcement.message,
            ctaLabel: announcement.ctaLabel ?? "",
            ctaUrl: announcement.ctaUrl ?? "",
            bgColor: announcement.bgColor,
            textColor: announcement.textColor,
            position: announcement.position,
            dismissible: announcement.dismissible,
            isActive: announcement.isActive,
          }
        : DEFAULT_ANNOUNCEMENT,
    );
  }, [open, announcement, form]);

  const values = form.watch();

  const onSubmit = async (data: AnnouncementFormSchema) => {
    // "all" and "every platform ticked" are form-only - Convex wants both
    // fields absent when they mean "no restriction"
    const payload = {
      ...data,
      departmentId: toDepartmentArg(data.departmentId),
      platforms: toPlatformsArg(data.platforms),
    };

    try {
      if (announcement) {
        await update({ announcementId: announcement._id, ...payload });
        toast.success("Announcement updated");
      } else {
        await create(payload);
        toast.success("Announcement created");
      }

      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {announcement ? "Edit announcement" : "New announcement"}
          </DialogTitle>
          <DialogDescription>
            Banners and popups show on your website above the chat widget
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label>Preview</Label>
          <AnnouncementPreview values={values} />
        </div>

        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <DepartmentField
              control={form.control}
              description="Only pages whose snippet names this department will show it"
              name="departmentId"
            />

            <PlatformsField
              control={form.control}
              description="Untick a surface to keep this off it - an app download prompt has no business inside the app"
              name="platforms"
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="banner">Banner (bar)</SelectItem>
                        <SelectItem value="popup">Popup (modal)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Position</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={values.type === "popup"}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="top">Top</SelectItem>
                        <SelectItem value="bottom">Bottom</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {values.type === "popup"
                        ? "Popups are always centered"
                        : "Where the bar sticks"}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g. New feature 🎉" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={2}
                      placeholder="e.g. We just shipped dark mode. Try it now!"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="ctaLabel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Button text</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. Learn more" />
                    </FormControl>
                    <FormDescription>Leave empty for no button</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ctaUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Button link</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="https://example.com" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label>Colors</Label>
              <div className="flex flex-wrap gap-2">
                {COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => {
                      form.setValue("bgColor", preset.bgColor);
                      form.setValue("textColor", preset.textColor);
                    }}
                    className="rounded-md border px-3 py-1.5 text-xs font-medium"
                    style={{
                      background: preset.bgColor,
                      color: preset.textColor,
                    }}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="bgColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Background</FormLabel>
                      <div className="flex items-center gap-2">
                        <FormControl>
                          <Input
                            type="color"
                            className="h-9 w-14 p-1"
                            {...field}
                          />
                        </FormControl>
                        <Input
                          value={field.value}
                          onChange={field.onChange}
                          className="flex-1"
                        />
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="textColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Text</FormLabel>
                      <div className="flex items-center gap-2">
                        <FormControl>
                          <Input
                            type="color"
                            className="h-9 w-14 p-1"
                            {...field}
                          />
                        </FormControl>
                        <Input
                          value={field.value}
                          onChange={field.onChange}
                          className="flex-1"
                        />
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <FormField
              control={form.control}
              name="dismissible"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Dismissible</FormLabel>
                    <FormDescription>
                      Visitors can close it, and it stays closed for them
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Live</FormLabel>
                    <FormDescription>
                      Show this on your website right now
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {announcement ? "Save changes" : "Create"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
