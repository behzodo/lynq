import { Doc, Id } from "@workspace/backend/_generated/dataModel";

/**
 * A Radix Select item cannot carry an empty value, so "belongs to every
 * department" needs a sentinel in the form layer. It is translated back to
 * `undefined` before it ever reaches Convex.
 */
export const ALL_DEPARTMENTS = "all" as const;

export const toDepartmentArg = (
  value: string | undefined,
): Id<"departments"> | undefined =>
  !value || value === ALL_DEPARTMENTS ? undefined : (value as Id<"departments">);

export const toDepartmentField = (
  departmentId: Id<"departments"> | undefined,
): string => departmentId ?? ALL_DEPARTMENTS;

/** Label for a record's department, for cards and lists. */
export const departmentLabel = (
  departments: Doc<"departments">[] | undefined,
  departmentId: Id<"departments"> | undefined,
): string => {
  if (!departmentId) {
    return "All departments";
  }

  return (
    departments?.find((department) => department._id === departmentId)?.name ??
    // The row survives its department being removed; say so rather than
    // rendering a raw id.
    "Unknown department"
  );
};
