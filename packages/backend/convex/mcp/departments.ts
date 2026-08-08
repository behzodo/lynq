import { v } from "convex/values";
import { query } from "../_generated/server";
import { assertMcpSecret } from "./lib";

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
