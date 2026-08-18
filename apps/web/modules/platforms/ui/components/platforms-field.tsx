"use client";

import type { Control, FieldValues, Path } from "react-hook-form";
import { Checkbox } from "@workspace/ui/components/checkbox";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form";
import { PLATFORMS, type Platform } from "../../constants";

/**
 * Shared platform picker for the announcement and survey forms. Generic over
 * the form shape so both can pass their own `control` without casting, the
 * same way DepartmentField does.
 */
export const PlatformsField = <T extends FieldValues>({
  control,
  name,
  description,
}: {
  control: Control<T>;
  name: Path<T>;
  description: string;
}) => (
  <FormField
    control={control}
    name={name}
    render={({ field }) => {
      const selected: Platform[] = Array.isArray(field.value)
        ? (field.value as Platform[])
        : [];

      const toggle = (platform: Platform, checked: boolean) => {
        field.onChange(
          checked
            ? [...selected, platform]
            : selected.filter((value) => value !== platform),
        );
      };

      return (
        <FormItem>
          <FormLabel>Show on</FormLabel>
          <div className="flex flex-wrap gap-4">
            {PLATFORMS.map((platform) => (
              <label
                className="flex cursor-pointer items-center gap-2 text-sm"
                key={platform.value}
              >
                <FormControl>
                  <Checkbox
                    checked={selected.includes(platform.value)}
                    onCheckedChange={(checked) =>
                      toggle(platform.value, checked === true)
                    }
                  />
                </FormControl>
                {platform.label}
              </label>
            ))}
          </div>
          <FormDescription>{description}</FormDescription>
          <FormMessage />
        </FormItem>
      );
    }}
  />
);
