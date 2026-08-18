import { createLynqClient, type LynqClient } from '@workspace/sdk-core';
import { EMBED_CONFIG } from './config';

/**
 * One client shared by the announcements and surveys controllers, so the
 * organization, department and platform are configured in a single place.
 */
export function createEmbedClient(
  organizationId: string,
  departmentId?: string | null,
): LynqClient {
  return createLynqClient({
    convexHttpUrl: EMBED_CONFIG.CONVEX_HTTP_URL,
    organizationId,
    departmentId,
    // Explicit, even though the server reads a missing platform as "web" for
    // the sake of embed scripts already cached on customer sites.
    platform: 'web',
    onError: (message, error) => {
      console.error(`Echo Widget: ${message}`, error);
    },
  });
}
