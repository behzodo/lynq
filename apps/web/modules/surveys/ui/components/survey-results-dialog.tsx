"use client";

import { useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { Loader2Icon, MessageSquareIcon } from "lucide-react";
import { api } from "@workspace/backend/_generated/api";
import { Id } from "@workspace/backend/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";

interface Props {
  surveyId: Id<"surveys"> | null;
  onOpenChange: (open: boolean) => void;
};

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg border p-3">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="text-2xl font-semibold">{value}</p>
  </div>
);

export const SurveyResultsDialog = ({ surveyId, onOpenChange }: Props) => {
  const results = useQuery(
    api.private.surveys.getResults,
    surveyId ? { surveyId } : "skip",
  );

  const maxCount = results
    ? Math.max(1, ...results.distribution.map((bucket) => bucket.count))
    : 1;

  return (
    <Dialog open={surveyId !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Results</DialogTitle>
          <DialogDescription>
            {results ? results.survey.question : "Loading..."}
          </DialogDescription>
        </DialogHeader>

        {results === undefined && (
          <div className="flex items-center justify-center py-12">
            <Loader2Icon className="animate-spin text-muted-foreground" />
          </div>
        )}

        {results && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Stat label="Responses" value={String(results.total)} />
              {results.survey.type !== "text" && (
                <Stat
                  label="Average"
                  value={
                    results.average === null
                      ? "—"
                      : results.average.toFixed(1)
                  }
                />
              )}
              {results.survey.type === "nps" && (
                <Stat
                  label="NPS"
                  value={results.nps === null ? "—" : String(results.nps)}
                />
              )}
            </div>

            {results.survey.type !== "text" && results.total > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Breakdown</p>
                {results.distribution.map((bucket) => (
                  <div key={bucket.value} className="flex items-center gap-3">
                    <span className="w-6 shrink-0 text-right text-xs text-muted-foreground">
                      {bucket.value}
                    </span>
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{
                          width: `${(bucket.count / maxCount) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="w-8 shrink-0 text-xs text-muted-foreground">
                      {bucket.count}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <p className="text-sm font-medium">Recent answers</p>

              {results.responses.length === 0 && (
                <div className="flex flex-col items-center gap-y-2 rounded-lg border py-10 text-center">
                  <MessageSquareIcon className="size-6 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    No responses yet
                  </p>
                </div>
              )}

              {results.responses.map((response) => (
                <div key={response.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">
                      {response.score === null
                        ? "Comment"
                        : results.survey.type === "rating"
                          ? "★".repeat(response.score)
                          : `Score ${response.score}`}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(response.creationTime, {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                  {response.comment && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {response.comment}
                    </p>
                  )}
                  {response.url && (
                    <p className="mt-1 truncate text-xs text-muted-foreground/70">
                      {response.url}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
