import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { assertMcpSecret } from "./lib";
import { cleanDescription, cleanName } from "../private/departments";

export const getMany = query({
  args: {
    secret: v.string(),
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    assertMcpSecret(args.secret);

    const departments = await ctx.db
      .query("departments")
      .withIndex("by_organization_id", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .order("desc")
      .collect();

    return departments.map((department) => ({
      id: department._id,
      name: department.name,
      description: department.description ?? "",
    }));
  },
});

export const create = mutation({
  args: {
    secret: v.string(),
    organizationId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    assertMcpSecret(args.secret);

    const name = cleanName(args.name);

    const existing = await ctx.db
      .query("departments")
      .withIndex("by_organization_id", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .collect();

    // An agent that retries a failed call, or that forgets to list first,
    // would otherwise quietly build up duplicates. Handing back the existing
    // id lets it carry on instead of hitting a dead end.
    const duplicate = existing.find(
      (department) => department.name.toLowerCase() === name.toLowerCase(),
    );

    if (duplicate) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: `A department named "${duplicate.name}" already exists. Use its id: ${duplicate._id}`,
      });
    }

    const departmentId = await ctx.db.insert("departments", {
      organizationId: args.organizationId,
      name,
      description: cleanDescription(args.description),
    });

    return {
      id: departmentId,
      name,
      description: cleanDescription(args.description) ?? "",
    };
  },
});
