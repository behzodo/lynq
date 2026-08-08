"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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

const departmentSchema = z.object({
  name: z.string().min(1, "Name is required").max(60),
  description: z.string().max(200).optional(),
});

type DepartmentFormSchema = z.infer<typeof departmentSchema>;

const EMPTY: DepartmentFormSchema = { name: "", description: "" };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present when editing, absent when creating */
  department?: Doc<"departments"> | null;
}

export const DepartmentFormDialog = ({
  open,
  onOpenChange,
  department,
}: Props) => {
  const create = useMutation(api.private.departments.create);
  const update = useMutation(api.private.departments.update);

  const form = useForm<DepartmentFormSchema>({
    resolver: zodResolver(departmentSchema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    form.reset(
      department
        ? {
            name: department.name,
            description: department.description ?? "",
          }
        : EMPTY,
    );
  }, [open, department, form]);

  const onSubmit = async (data: DepartmentFormSchema) => {
    try {
      if (department) {
        await update({ departmentId: department._id, ...data });
        toast.success("Department updated");
      } else {
        await create(data);
        toast.success("Department created");
      }

      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong");
    }
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {department ? "Edit department" : "New department"}
          </DialogTitle>
          <DialogDescription>
            A separate product or site inside your organization, like Delivery
            or Warehouse
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g. Delivery" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g. The courier-facing mobile app"
                    />
                  </FormControl>
                  <FormDescription>
                    Only you see this - it never shows to customers
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button
                onClick={() => onOpenChange(false)}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button disabled={form.formState.isSubmitting} type="submit">
                {department ? "Save changes" : "Create"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
