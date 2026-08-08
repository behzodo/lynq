"use client";

import { useMemo, useState } from "react";
import { useOrganization } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import { Building2Icon, PencilIcon, PlusIcon, TrashIcon } from "lucide-react";
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
import { Badge } from "@workspace/ui/components/badge";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { SnippetTabs } from "@/modules/integrations/ui/components/snippet-tabs";
import { DepartmentFormDialog } from "../components/department-form-dialog";

type Department = Doc<"departments">;

export const DepartmentsView = () => {
  const { organization } = useOrganization();
  const organizationId = organization?.id ?? "";

  const departments = useQuery(api.private.departments.getMany);
  const announcements = useQuery(api.private.announcements.getMany);
  const surveys = useQuery(api.private.surveys.getMany);
  const remove = useMutation(api.private.departments.remove);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Department | null>(null);

  // How many announcements and surveys each department owns, so the card can
  // say what deleting it would block.
  const usage = useMemo(() => {
    const counts = new Map<string, { announcements: number; surveys: number }>();

    const bump = (id: string | undefined, key: "announcements" | "surveys") => {
      if (!id) return;
      const entry = counts.get(id) ?? { announcements: 0, surveys: 0 };
      entry[key] += 1;
      counts.set(id, entry);
    };

    for (const item of announcements ?? []) bump(item.departmentId, "announcements");
    for (const item of surveys ?? []) bump(item.departmentId, "surveys");

    return counts;
  }, [announcements, surveys]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const onDelete = async () => {
    if (!pendingDelete) {
      return;
    }

    try {
      await remove({ departmentId: pendingDelete._id });
      toast.success("Department deleted");
    } catch (error) {
      console.error(error);
      // The backend refuses while anything still targets it, and the message
      // says how many - surface that rather than a generic failure.
      const message =
        error instanceof ConvexError
          ? (error.data as { message?: string })?.message
          : undefined;
      toast.error(message ?? "Could not delete");
    } finally {
      setPendingDelete(null);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-muted p-8">
      <div className="mx-auto w-full max-w-screen-md">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5">
            <h1 className="font-semibold text-2xl tracking-tight md:text-4xl">
              Departments
            </h1>
            <p className="text-muted-foreground">
              Separate products or sites, so a warehouse banner never shows on
              the delivery app
            </p>
          </div>
          <Button onClick={openCreate} size="lg">
            <PlusIcon className="size-4" />
            New department
          </Button>
        </div>

        {departments === undefined ? (
          <div className="mt-8 space-y-3">
            {[0, 1].map((index) => (
              <Skeleton className="h-40 rounded-xl" key={index} />
            ))}
          </div>
        ) : departments.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed bg-background/50 px-6 py-16 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-foreground text-background">
              <Building2Icon className="size-5" />
            </div>
            <p className="mt-4 font-semibold">No departments yet</p>
            <p className="mx-auto mt-1 max-w-md text-muted-foreground text-sm">
              Without departments every announcement and survey shows on every
              site you install the widget on. Add one per product to aim them.
            </p>
            <Button className="mt-5" onClick={openCreate} size="lg">
              <PlusIcon className="size-4" />
              Create your first department
            </Button>
          </div>
        ) : (
          <div className="mt-8 space-y-3">
            {departments.map((department) => {
              const counts = usage.get(department._id);

              return (
                <div
                  className="space-y-4 rounded-xl border bg-background p-5"
                  key={department._id}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-semibold">{department.name}</h2>
                        <Badge className="text-[11px]" variant="secondary">
                          {counts?.announcements ?? 0} announcement
                          {counts?.announcements === 1 ? "" : "s"}
                        </Badge>
                        <Badge className="text-[11px]" variant="secondary">
                          {counts?.surveys ?? 0} survey
                          {counts?.surveys === 1 ? "" : "s"}
                        </Badge>
                      </div>
                      {department.description && (
                        <p className="text-muted-foreground text-sm">
                          {department.description}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-1">
                      <Button
                        onClick={() => {
                          setEditing(department);
                          setFormOpen(true);
                        }}
                        size="icon"
                        variant="ghost"
                      >
                        <PencilIcon className="size-4" />
                      </Button>
                      <Button
                        onClick={() => setPendingDelete(department)}
                        size="icon"
                        variant="ghost"
                      >
                        <TrashIcon className="size-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-muted-foreground text-xs">
                      Use this snippet on this product&apos;s site instead of
                      the generic one
                    </p>
                    <SnippetTabs
                      departmentId={department._id}
                      organizationId={organizationId}
                      showPlacement={false}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <DepartmentFormDialog
        department={editing}
        onOpenChange={setFormOpen}
        open={formOpen}
      />

      <AlertDialog
        onOpenChange={(open) => !open && setPendingDelete(null)}
        open={pendingDelete !== null}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete &quot;{pendingDelete?.name}&quot;?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Pages still using this department&apos;s snippet will fall back to
              organization-wide announcements only. Announcements and surveys
              aimed at it must be moved first.
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
