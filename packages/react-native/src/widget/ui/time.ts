/**
 * "3m ago" and friends.
 *
 * Written out rather than pulled from date-fns: this is the only date
 * formatting the package does, and a published SDK is a poor place to add a
 * dependency the host app then has to carry.
 */
export function relativeTime(timestamp: number): string {
  const seconds = Math.round((Date.now() - timestamp) / 1000);

  if (seconds < 60) {
    return "just now";
  }

  const minutes = Math.round(seconds / 60);

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.round(minutes / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.round(hours / 24);

  if (days < 7) {
    return `${days}d ago`;
  }

  const weeks = Math.round(days / 7);

  if (weeks < 5) {
    return `${weeks}w ago`;
  }

  const months = Math.round(days / 30);

  return months < 12 ? `${months}mo ago` : `${Math.round(days / 365)}y ago`;
}
