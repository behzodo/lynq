import { ConvexError, v } from "convex/values";
import { mutation, query, QueryCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

const MAX_NAME_LENGTH = 60;
const MAX_DESCRIPTION_LENGTH = 200;

/**
 * The org id if the caller has one, otherwise null. Reads use this so they can
 * return an empty list during the window where Convex auth has not caught up
 * with Clerk yet - a leaf component mounting mid org switch is not an error.
 */
async function getOrgId(ctx: QueryCtx) {
  const identity = (await ctx.auth.getUserIdentity()) as {
    orgId?: string;
  } | null;

  return identity?.orgId ?? null;
}

async function requireOrgId(ctx: QueryCtx) {
  const identity = (await ctx.auth.getUserIdentity()) as {
    orgId?: string;
  } | null;

  if (identity === null) {
    throw new ConvexError({
      code: "UNAUTHORIZED",
      message: "Identity not found",
    });
  }

  if (!identity.orgId) {
    throw new ConvexError({
      code: "UNAUTHORIZED",
      message: "Organization not found",
    });
  }

  return identity.orgId;
}

/**
 * Resolves a department id supplied by a caller, proving it belongs to `orgId`
 * before anything is allowed to point at it. Every write that accepts a
 * departmentId goes through here - otherwise one organization could aim its
 * announcements at another's department.
 */
export async function assertDepartmentInOrg(
  ctx: QueryCtx,
  departmentId: Id<"departments"> | undefined,
  orgId: string,
) {
  if (departmentId === undefined) {
    return;
  }

  const department = await ctx.db.get(departmentId);

  if (!department) {
    throw new ConvexError({
      code: "NOT_FOUND",
      message: "Department not found",
    });
  }

  if (department.organizationId !== orgId) {
    throw new ConvexError({
      code: "UNAUTHORIZED",
      message: "Department belongs to another organization",
    });
  }
}

function cleanName(name: string) {
  const trimmed = name.trim();

  if (!trimmed) {
    throw new ConvexError({
      code: "BAD_REQUEST",
      message: "Name is required",
    });
  }

  return trimmed.slice(0, MAX_NAME_LENGTH);
}

export const getMany = query({
  args: {},
  handler: async (ctx) => {
    const orgId = await getOrgId(ctx);

    if (orgId === null) {
      return [];
    }

    return await ctx.db
      .query("departments")
      .withIndex("by_organization_id", (q) => q.eq("organizationId", orgId))
      .order("desc")
      .collect();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const orgId = await requireOrgId(ctx);

    return await ctx.db.insert("departments", {
      organizationId: orgId,
      name: cleanName(args.name),
      description: args.description?.trim().slice(0, MAX_DESCRIPTION_LENGTH),
    });
  },
});

export const update = mutation({
  args: {
    departmentId: v.id("departments"),
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const orgId = await requireOrgId(ctx);
    await assertDepartmentInOrg(ctx, args.departmentId, orgId);

    await ctx.db.patch(args.departmentId, {
      name: cleanName(args.name),
      description: args.description?.trim().slice(0, MAX_DESCRIPTION_LENGTH),
    });
  },
});

/**
 * Refuses to delete a department that is still targeted by an announcement or
 * survey. Clearing the link instead would silently promote a warehouse-only
 * popup to every site the organization runs.
 */
export const remove = mutation({
  args: {
    departmentId: v.id("departments"),
  },
  handler: async (ctx, args) => {
    const orgId = await requireOrgId(ctx);
    await assertDepartmentInOrg(ctx, args.departmentId, orgId);

    const announcements = await ctx.db
      .query("announcements")
      .withIndex("by_organization_id", (q) => q.eq("organizationId", orgId))
      .collect();

    const surveys = await ctx.db
      .query("surveys")
      .withIndex("by_organization_id", (q) => q.eq("organizationId", orgId))
      .collect();

    const usedBy =
      announcements.filter((a) => a.departmentId === args.departmentId).length +
      surveys.filter((s) => s.departmentId === args.departmentId).length;

    if (usedBy > 0) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: `Still used by ${usedBy} announcement${usedBy === 1 ? "" : "s"} or survey${usedBy === 1 ? "" : "s"}. Move or delete those first.`,
      });
    }

    await ctx.db.delete(args.departmentId);
  },
});
