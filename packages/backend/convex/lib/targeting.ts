/**
 * Which surface a feed request is coming from.
 *
 * Anything the embed script and the app SDKs send arrives as a plain string -
 * these endpoints are open to the internet, so a bad value has to miss quietly
 * rather than fail validation.
 */
export const DEFAULT_PLATFORM = "web";

/**
 * Every embed install that predates the app SDK sends no platform at all, and
 * every one of them is a website. Defaulting to "web" is what lets an existing
 * organization tick "iOS only" on a new announcement without it leaking onto
 * their site through the old script.
 */
export function matchesPlatform(
  platforms: readonly string[] | undefined,
  requested: string | undefined,
): boolean {
  // Unset targets every surface, exactly like an unset departmentId. An empty
  // array is read the same way: nothing should ever become invisible
  // everywhere just because a form saved a cleared list.
  if (platforms === undefined || platforms.length === 0) {
    return true;
  }

  return platforms.includes(requested ?? DEFAULT_PLATFORM);
}
