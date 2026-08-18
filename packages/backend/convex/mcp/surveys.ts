import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { assertMcpSecret, assertSameOrg } from "./lib";
import { assertDepartmentInOrg } from "../private/departments";

const surveyFields = {
  departmentId: v.optional(v.id("departments")),
  platforms: v.optional(
    v.array(v.union(v.literal("web"), v.literal("ios"), v.literal("android"))),
  ),
  title: v.string(),
  question: v.string(),
  type: v.union(v.literal("rating"), v.literal("nps"), v.literal("text")),
  commentLabel: v.optional(v.string()),
  thankYouMessage: v.string(),
  bgColor: v.string(),
  textColor: v.string(),
  position: v.union(
    v.literal("bottom-right"),
    v.literal("bottom-left"),
    v.literal("center"),
  ),
  delaySeconds: v.number(),
  isActive: v.boolean(),
};

export const getMany = query({
  args: {
    secret: v.string(),
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    assertMcpSecret(args.secret);
    const orgId = args.organizationId;

    return await ctx.db
      .query("surveys")
      .withIndex("by_organization_id", (q) => q.eq("organizationId", orgId))
      .order("desc")
      .collect();
  },
});

export const create = mutation({
  args: {
    secret: v.string(),
    organizationId: v.string(),
    ...surveyFields,
  },
  handler: async (ctx, args) => {
    const { secret, organizationId, ...fields } = args;
    assertMcpSecret(secret);
    const orgId = organizationId;

    await assertDepartmentInOrg(ctx, fields.departmentId, orgId);

    return await ctx.db.insert("surveys", {
      ...fields,
      organizationId: orgId,
    });
  },
});

export const update = mutation({
  args: {
    secret: v.string(),
    organizationId: v.string(),
    surveyId: v.id("surveys"),
    ...surveyFields,
  },
  handler: async (ctx, args) => {
    const { secret, organizationId, surveyId, ...fields } = args;
    assertMcpSecret(secret);
    const orgId = organizationId;

    const survey = await ctx.db.get(surveyId);

    if (!survey) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Survey not found" });
    }

    assertSameOrg(survey.organizationId, orgId, "Survey");
    await assertDepartmentInOrg(ctx, fields.departmentId, orgId);

    await ctx.db.patch(surveyId, fields);
  },
});

export const setActive = mutation({
  args: {
    secret: v.string(),
    organizationId: v.string(),
    surveyId: v.id("surveys"),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    assertMcpSecret(args.secret);
    const orgId = args.organizationId;

    const survey = await ctx.db.get(args.surveyId);

    if (!survey) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Survey not found" });
    }

    assertSameOrg(survey.organizationId, orgId, "Survey");

    await ctx.db.patch(args.surveyId, { isActive: args.isActive });
  },
});

export const remove = mutation({
  args: {
    secret: v.string(),
    organizationId: v.string(),
    surveyId: v.id("surveys"),
  },
  handler: async (ctx, args) => {
    assertMcpSecret(args.secret);
    const orgId = args.organizationId;

    const survey = await ctx.db.get(args.surveyId);

    if (!survey) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Survey not found" });
    }

    assertSameOrg(survey.organizationId, orgId, "Survey");

    await ctx.db.delete(args.surveyId);
  },
});

export const getResults = query({
  args: {
    secret: v.string(),
    organizationId: v.string(),
    surveyId: v.id("surveys"),
  },
  handler: async (ctx, args) => {
    assertMcpSecret(args.secret);
    const orgId = args.organizationId;

    const survey = await ctx.db.get(args.surveyId);

    if (!survey) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Survey not found" });
    }

    assertSameOrg(survey.organizationId, orgId, "Survey");

    const responses = await ctx.db
      .query("surveyResponses")
      .withIndex("by_survey_id", (q) => q.eq("surveyId", args.surveyId))
      .collect();

    const scores = responses
      .map((response) => response.score)
      .filter((score): score is number => score !== undefined);

    return {
      total: responses.length,
      averageScore: scores.length
        ? scores.reduce((sum, score) => sum + score, 0) / scores.length
        : null,
      comments: responses
        .map((response) => response.comment)
        .filter((comment): comment is string => Boolean(comment)),
    };
  },
});
