"use client";

import Link from "next/link";
import type { Control, FieldValues, Path } from "react-hook-form";
import { useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { ALL_DEPARTMENTS } from "../../constants";

/**
 * Shared department picker for the announcement and survey forms. Generic over
 * the form shape so both can pass their own `control` without casting.
 */
export const DepartmentField = <T extends FieldValues>({
  control,
  name,
  description,
}: {
  control: Control<T>;
  name: Path<T>;
  description: string;
}) => {
  const departments = useQuery(api.private.departments.getMany);

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>Department</FormLabel>
          <Select
            onValueChange={field.onChange}
            value={field.value || ALL_DEPARTMENTS}
          >
            <FormControl>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value={ALL_DEPARTMENTS}>All departments</SelectItem>
              {(departments ?? []).map((department) => (
                <SelectItem key={department._id} value={department._id}>
                  {department.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormDescription>
            {departments !== undefined && departments.length === 0 ? (
              <>
                No departments yet.{" "}
                <Link className="underline" href="/departments">
                  Create one
                </Link>{" "}
                to target a single product.
              </>
            ) : (
              description
            )}
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
