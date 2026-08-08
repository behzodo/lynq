"use client";

import { formatDistanceToNow } from "date-fns";
import {
  BarChart3Icon,
  MessageSquareIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Switch } from "@workspace/ui/components/switch";
import { cn } from "@workspace/ui/lib/utils";
import { SURVEY_TYPE_LABELS, SurveyRow } from "../../schemas";

interface Props {
  survey: SurveyRow;
  onToggle: (survey: SurveyRow, isActive: boolean) => void;
  onResults: (survey: SurveyRow) => void;
  onEdit: (survey: SurveyRow) => void;
  onDelete: (survey: SurveyRow) => void;
};

/** Miniature of what the visitor sees, painted in the survey's own colours. */
const Thumbnail = ({ survey }: { survey: SurveyRow }) => {
  const marks =
    survey.type === "nps"
      ? ["7", "8", "9"]
      : survey.type === "rating"
        ? ["★", "★", "★"]
        : ["…"];

  return (
    <div
      className="flex size-16 shrink-0 flex-col items-center justify-center gap-1.5 rounded-xl border shadow-sm"
      style={{ background: survey.bgColor, color: survey.textColor }}
    >
      <div className="h-1 w-7 rounded-full bg-current opacity-60" />
      <div className="flex gap-0.5">
        {marks.map((mark, index) => (
          <span
            className="text-[9px] leading-none opacity-90"
            key={`${mark}-${index}`}
          >
            {mark}
          </span>
        ))}
      </div>
      <div className="h-1 w-9 rounded-full bg-current opacity-30" />
    </div>
  );
};

const Metric = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col">
    <span className="font-semibold text-sm tabular-nums">{value}</span>
    <span className="text-[11px] text-muted-foreground">{label}</span>
  </div>
);

export const SurveyCard = ({
  survey,
  onToggle,
  onResults,
  onEdit,
  onDelete,
}: Props) => {
  const hasScore = survey.type !== "text";
  const scale = survey.type === "nps" ? 10 : 5;

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border bg-background p-4 transition-all",
        "hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-md",
        !survey.isActive && "opacity-70 hover:opacity-100",
      )}
    >
      {/* Left rail marks a live survey without adding another badge */}
      <span
        className={cn(
          "absolute inset-y-0 left-0 w-0.5",
          survey.isActive ? "bg-foreground" : "bg-transparent",
        )}
      />

      <div className="flex items-start gap-4 pl-1.5">
        <Thumbnail survey={survey} />

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="truncate font-semibold">{survey.title}</p>
            <span className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
              {SURVEY_TYPE_LABELS[survey.type]}
            </span>
            {survey.isActive ? (
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

          <p className="line-clamp-1 text-muted-foreground text-sm">
            {survey.question}
          </p>

          <div className="flex flex-wrap items-end gap-x-6 gap-y-2 pt-1">
            <Metric label="responses" value={String(survey.responseCount)} />

            {hasScore && (
              <Metric
                label={`avg / ${scale}`}
                value={
                  survey.average === null ? "—" : survey.average.toFixed(1)
                }
              />
            )}

            {survey.type === "nps" && (
              <Metric
                label="NPS"
                value={survey.nps === null ? "—" : String(survey.nps)}
              />
            )}

            {survey.commentCount > 0 && (
              <div className="flex items-center gap-1.5 pb-0.5 text-muted-foreground text-xs">
                <MessageSquareIcon className="size-3.5" />
                {survey.commentCount}
              </div>
            )}

            {survey.lastResponseAt && (
              <span className="pb-0.5 text-[11px] text-muted-foreground">
                last{" "}
                {formatDistanceToNow(new Date(survey.lastResponseAt), {
                  addSuffix: true,
                })}
              </span>
            )}
          </div>

          {/* Fill bar: how the average sits on the scale */}
          {hasScore && survey.average !== null && (
            <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-foreground transition-all"
                style={{ width: `${(survey.average / scale) * 100}%` }}
              />
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Switch
            checked={survey.isActive}
            onCheckedChange={(checked) => onToggle(survey, checked)}
          />
          {/* Actions stay quiet until the row is hovered or focused */}
          <div className="flex opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
            <Button
              onClick={() => onResults(survey)}
              size="icon"
              title="Results"
              variant="ghost"
            >
              <BarChart3Icon className="size-4" />
            </Button>
            <Button
              onClick={() => onEdit(survey)}
              size="icon"
              title="Edit"
              variant="ghost"
            >
              <PencilIcon className="size-4" />
            </Button>
            <Button
              onClick={() => onDelete(survey)}
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
