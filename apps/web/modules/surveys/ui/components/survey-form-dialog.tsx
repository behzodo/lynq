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
  DEFAULT_SURVEY,
  SURVEY_COLOR_PRESETS,
  SURVEY_TYPE_LABELS,
  SurveyFormSchema,
  surveySchema,
} from "../../schemas";
import { SurveyPreview } from "./survey-preview";
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
  survey?: Doc<"surveys"> | null;
};

export const SurveyFormDialog = ({ open, onOpenChange, survey }: Props) => {
  const create = useMutation(api.private.surveys.create);
  const update = useMutation(api.private.surveys.update);

  const form = useForm<SurveyFormSchema>({
    resolver: zodResolver(surveySchema),
    defaultValues: DEFAULT_SURVEY,
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    form.reset(
      survey
        ? {
            departmentId: toDepartmentField(survey.departmentId),
            platforms: toPlatformsField(survey.platforms),
            title: survey.title,
            question: survey.question,
            type: survey.type,
            commentLabel: survey.commentLabel ?? "",
            thankYouMessage: survey.thankYouMessage,
            bgColor: survey.bgColor,
            textColor: survey.textColor,
            position: survey.position,
            delaySeconds: survey.delaySeconds,
            isActive: survey.isActive,
          }
        : DEFAULT_SURVEY,
    );
  }, [open, survey, form]);

  const values = form.watch();

  const onSubmit = async (data: SurveyFormSchema) => {
    // "all" and "every platform ticked" are form-only - Convex wants both
    // fields absent when they mean "no restriction"
    const payload = {
      ...data,
      departmentId: toDepartmentArg(data.departmentId),
      platforms: toPlatformsArg(data.platforms),
    };

    try {
      if (survey) {
        await update({ surveyId: survey._id, ...payload });
        toast.success("Survey updated");
      } else {
        await create(payload);
        toast.success("Survey created");
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
          <DialogTitle>{survey ? "Edit survey" : "New survey"}</DialogTitle>
          <DialogDescription>
            Ask your website visitors a question and collect their answers
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label>Preview</Label>
          <SurveyPreview values={values} />
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
              description="Untick a surface to keep this survey off it"
              name="platforms"
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Answer type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(SURVEY_TYPE_LABELS).map(
                          ([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ),
                        )}
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
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="bottom-right">
                          Bottom right
                        </SelectItem>
                        <SelectItem value="bottom-left">Bottom left</SelectItem>
                        <SelectItem value="center">Center</SelectItem>
                      </SelectContent>
                    </Select>
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
                    <Input {...field} placeholder="e.g. Quick question" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="question"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Question</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={2}
                      placeholder="e.g. How likely are you to recommend us?"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="commentLabel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Comment box placeholder</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Tell us more (optional)" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="delaySeconds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Show after (seconds)</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} max={600} {...field} />
                    </FormControl>
                    <FormDescription>
                      Wait this long before showing it
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="thankYouMessage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Thank you message</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Thanks for your feedback!" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <Label>Colors</Label>
              <div className="flex flex-wrap gap-2">
                {SURVEY_COLOR_PRESETS.map((preset) => (
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
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Live</FormLabel>
                    <FormDescription>
                      Collect answers on your website right now
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
                {survey ? "Save changes" : "Create"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
