"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import {
  BarChart3Icon,
  ClipboardListIcon,
  Loader2Icon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { api } from "@workspace/backend/_generated/api";
import { Doc, Id } from "@workspace/backend/_generated/dataModel";
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
import { SURVEY_TYPE_LABELS } from "../../schemas";
import { SurveyFormDialog } from "../components/survey-form-dialog";
import { SurveyResultsDialog } from "../components/survey-results-dialog";

type SurveyRow = Doc<"surveys"> & { responseCount: number };

export const SurveysView = () => {
  const surveys = useQuery(api.private.surveys.getMany);
  const setActive = useMutation(api.private.surveys.setActive);
  const remove = useMutation(api.private.surveys.remove);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Doc<"surveys"> | null>(null);
  const [resultsId, setResultsId] = useState<Id<"surveys"> | null>(null);
  const [pendingDelete, setPendingDelete] = useState<SurveyRow | null>(null);

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

  if (surveys === undefined) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-y-2 bg-muted p-8">
        <Loader2Icon className="animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading surveys...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted p-8">
      <div className="mx-auto w-full max-w-screen-md">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-2xl md:text-4xl">Surveys</h1>
            <p className="text-muted-foreground">
              Ask visitors a question and collect feedback
            </p>
          </div>
          <Button onClick={openCreate}>
            <PlusIcon className="size-4" />
            New
          </Button>
        </div>

        <div className="mt-8 space-y-3">
          {surveys.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center gap-y-3 py-12 text-center">
                <ClipboardListIcon className="size-8 text-muted-foreground" />
                <div className="space-y-1">
                  <p className="font-medium">No surveys yet</p>
                  <p className="text-sm text-muted-foreground">
                    Create one to start collecting feedback
                  </p>
                </div>
                <Button onClick={openCreate} variant="outline">
                  <PlusIcon className="size-4" />
                  Create one
                </Button>
              </CardContent>
            </Card>
          )}

          {surveys.map((survey) => (
            <Card key={survey._id}>
              <CardContent className="flex items-center gap-4 py-4">
                <div
                  className="flex size-10 shrink-0 items-center justify-center rounded-md"
                  style={{
                    background: survey.bgColor,
                    color: survey.textColor,
                  }}
                >
                  <ClipboardListIcon className="size-4" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium">{survey.title}</p>
                    <Badge variant="secondary">
                      {SURVEY_TYPE_LABELS[survey.type]}
                    </Badge>
                    {survey.isActive ? (
                      <Badge className="bg-green-600 hover:bg-green-600">
                        Live
                      </Badge>
                    ) : (
                      <Badge variant="outline">Paused</Badge>
                    )}
                  </div>
                  <p className="truncate text-sm text-muted-foreground">
                    {survey.responseCount} response
                    {survey.responseCount === 1 ? "" : "s"} · {survey.question}
                  </p>
                </div>

                <Switch
                  checked={survey.isActive}
                  onCheckedChange={(checked) => onToggle(survey, checked)}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setResultsId(survey._id)}
                >
                  <BarChart3Icon className="size-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    setEditing(survey);
                    setFormOpen(true);
                  }}
                >
                  <PencilIcon className="size-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setPendingDelete(survey)}
                >
                  <Trash2Icon className="size-4 text-destructive" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <SurveyFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        survey={editing}
      />

      <SurveyResultsDialog
        surveyId={resultsId}
        onOpenChange={(open) => !open && setResultsId(null)}
      />

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
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
