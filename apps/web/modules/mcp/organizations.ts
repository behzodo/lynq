import { clerkClient } from "@clerk/nextjs/server";

export type McpOrganization = {
  id: string;
  name: string;
};

/**
 * The OAuth token identifies a *user*, but every announcement and survey is
 * scoped to an *organization*. This resolves the organizations that user
 * actually belongs to, which is also the only thing that stops a caller from
 * naming somebody else's organization id.
 */
export async function listUserOrganizations(
  userId: string,
): Promise<McpOrganization[]> {
  const clerk = await clerkClient();

  const memberships = await clerk.users.getOrganizationMembershipList({
    userId,
    limit: 100,
  });

  return memberships.data.map((membership) => ({
    id: membership.organization.id,
    name: membership.organization.name,
  }));
}

/**
 * Picks the organization a tool call should act on.
 *
 * One membership -> used automatically, so solo users never think about it.
 * Several         -> the caller must name one, and it must be one of theirs.
 */
export async function resolveOrganizationId(
  userId: string,
  requestedOrganizationId?: string,
): Promise<{ organizationId: string } | { error: string }> {
  const organizations = await listUserOrganizations(userId);

  if (organizations.length === 0) {
    return {
      error:
        "This account does not belong to any organization. Create one in the Lynq dashboard first.",
    };
  }

  if (requestedOrganizationId) {
    const match = organizations.find(
      (organization) => organization.id === requestedOrganizationId,
    );

    if (!match) {
      return {
        error: `You do not have access to organization ${requestedOrganizationId}. Call list_organizations to see the ones you can use.`,
      };
    }

    return { organizationId: match.id };
  }

  if (organizations.length === 1) {
    return { organizationId: organizations[0]!.id };
  }

  const options = organizations
    .map((organization) => `${organization.name} (${organization.id})`)
    .join(", ");

  return {
    error: `You belong to more than one organization, so organizationId is required. Choose one of: ${options}`,
  };
}
