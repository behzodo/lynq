/** The surfaces an announcement or survey can be aimed at. */
export type Platform = "web" | "ios" | "android";

export const PLATFORMS: { value: Platform; label: string }[] = [
  { value: "web", label: "Website" },
  { value: "ios", label: "iOS app" },
  { value: "android", label: "Android app" },
];

const ALL_PLATFORMS: Platform[] = PLATFORMS.map((platform) => platform.value);

const isEveryPlatform = (values: Platform[]) =>
  ALL_PLATFORMS.every((platform) => values.includes(platform));

/**
 * Unset in the database means every surface, so the form shows every box
 * ticked rather than none - "everywhere" and "nowhere" must not look alike.
 */
export const toPlatformsField = (
  platforms: Platform[] | undefined,
): Platform[] =>
  platforms && platforms.length > 0 ? platforms : ALL_PLATFORMS;

/**
 * Ticking every box saves as unset, not as the full list. The row then means
 * "everywhere" rather than "these three", so a surface added later is included
 * automatically instead of silently missing.
 */
export const toPlatformsArg = (
  values: Platform[] | undefined,
): Platform[] | undefined =>
  !values || values.length === 0 || isEveryPlatform(values)
    ? undefined
    : values;

/** Label for a record's platforms, for cards and lists. */
export const platformsLabel = (platforms: Platform[] | undefined): string => {
  const selected = toPlatformsArg(platforms);

  if (!selected) {
    return "All platforms";
  }

  return selected
    .map(
      (value) =>
        PLATFORMS.find((platform) => platform.value === value)?.label ?? value,
    )
    .join(", ");
};
