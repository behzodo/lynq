"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import {
  ClipboardListIcon,
  MessageSquareIcon,
  PlusIcon,
  RadioIcon,
  SparklesIcon,
} from "lucide-react";
import { api } from "@workspace/backend/_generated/api";
import { Doc, Id } from "@workspace/backend/_generated/dataModel";
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
import { SurveyRow } from "../../schemas";
import { SurveyCard } from "../components/survey-card";
import { SurveyFormDialog } from "../components/survey-form-dialog";
import { SurveyResultsDialog } from "../components/survey-results-dialog";

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

export const SurveysView = () => {
  const surveys = useQuery(api.private.surveys.getMany) as
    | SurveyRow[]
    | undefined;
  const setActive = useMutation(api.private.surveys.setActive);
  const remove = useMutation(api.private.surveys.remove);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Doc<"surveys"> | null>(null);
  const [resultsId, setResultsId] = useState<Id<"surveys"> | null>(null);
  const [pendingDelete, setPendingDelete] = useState<SurveyRow | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  const stats = useMemo(() => {
    const list = surveys ?? [];
    const responses = list.reduce(
      (total, survey) => total + survey.responseCount,
      0,
    );
    const comments = list.reduce(
      (total, survey) => total + survey.commentCount,
      0,
    );

    // Average across scored surveys only, weighted by how many people answered
    const scored = list.filter(
      (survey) => survey.type !== "text" && survey.average !== null,
    );
    const weighted = scored.reduce(
      (total, survey) => total + survey.average! * survey.responseCount,
      0,
    );
    const scoredResponses = scored.reduce(
      (total, survey) => total + survey.responseCount,
      0,
    );

    return {
      live: list.filter((survey) => survey.isActive).length,
      total: list.length,
      responses,
      comments,
      satisfaction:
        scoredResponses > 0 ? weighted / scoredResponses : null,
    };
  }, [surveys]);

  const visible = useMemo(() => {
    const list = surveys ?? [];

    if (filter === "live") return list.filter((survey) => survey.isActive);
    if (filter === "paused") return list.filter((survey) => !survey.isActive);
    return list;
  }, [surveys, filter]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const onToggle = async (survey: SurveyRow, isActive: boolean) => {
    try {
      await setActive({ surveyId: survey._id, isActive });
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
      await remove({ surveyId: pendingDelete._id });
      toast.success("Survey deleted");
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
              Surveys
            </h1>
            <p className="text-muted-foreground">
              Ask visitors a question and collect feedback
            </p>
          </div>
          <Button onClick={openCreate} size="lg">
            <PlusIcon className="size-4" />
            New survey
          </Button>
        </div>

        {surveys === undefined ? (
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
                hint={`${stats.comments} with a comment`}
                icon={MessageSquareIcon}
                label="Responses"
                value={String(stats.responses)}
              />
              <StatTile
                hint="across scored surveys"
                icon={SparklesIcon}
                label="Avg score"
                value={
                  stats.satisfaction === null
                    ? "—"
                    : stats.satisfaction.toFixed(1)
                }
              />
            </div>

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
                    <ClipboardListIcon className="size-5" />
                  </div>
                  <p className="mt-4 font-semibold">No surveys yet</p>
                  <p className="mx-auto mt-1 max-w-sm text-muted-foreground text-sm">
                    Ask visitors how you&apos;re doing with a star rating, an
                    NPS score, or an open question.
                  </p>
                  <Button className="mt-5" onClick={openCreate} size="lg">
                    <PlusIcon className="size-4" />
                    Create your first survey
                  </Button>
                </div>
              )}

              {stats.total > 0 && visible.length === 0 && (
                <div className="rounded-xl border border-dashed bg-background/50 px-6 py-12 text-center">
                  <p className="text-muted-foreground text-sm">
                    No {filter} surveys.
                  </p>
                </div>
              )}

              {visible.map((survey) => (
                <SurveyCard
                  key={survey._id}
                  onDelete={setPendingDelete}
                  onEdit={(item) => {
                    setEditing(item);
                    setFormOpen(true);
                  }}
                  onResults={(item) => setResultsId(item._id)}
                  onToggle={onToggle}
                  survey={survey}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <SurveyFormDialog
        onOpenChange={setFormOpen}
        open={formOpen}
        survey={editing}
      />

      <SurveyResultsDialog
        onOpenChange={(open) => !open && setResultsId(null)}
        surveyId={resultsId}
      />

      <AlertDialog
        onOpenChange={(open) => !open && setPendingDelete(null)}
        open={pendingDelete !== null}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete survey?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{pendingDelete?.title}&quot; and all{" "}
              {pendingDelete?.responseCount ?? 0} of its responses will be
              permanently deleted.
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
