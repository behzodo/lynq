import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";

const surveyFields = {
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

async function requireOrgId(ctx: {
  auth: { getUserIdentity: () => Promise<unknown> };
}) {
  const identity = (await ctx.auth.getUserIdentity()) as {
    orgId?: string;
  } | null;

  if (identity === null) {
    throw new ConvexError({
      code: "UNAUTHORIZED",
      message: "Identity not found",
    });
  }

  const orgId = identity.orgId;

  if (!orgId) {
    throw new ConvexError({
      code: "UNAUTHORIZED",
      message: "Organization not found",
    });
  }

  return orgId;
}

export const getMany = query({
  args: {},
  handler: async (ctx) => {
    const orgId = await requireOrgId(ctx);

    const surveys = await ctx.db
      .query("surveys")
      .withIndex("by_organization_id", (q) => q.eq("organizationId", orgId))
      .order("desc")
      .collect();

    // Response counts drive the list UI, so fetch them alongside
    return await Promise.all(
      surveys.map(async (survey) => {
        const responses = await ctx.db
          .query("surveyResponses")
          .withIndex("by_survey_id", (q) => q.eq("surveyId", survey._id))
          .collect();

        return { ...survey, responseCount: responses.length };
      }),
    );
  },
});

export const create = mutation({
  args: surveyFields,
  handler: async (ctx, args) => {
    const orgId = await requireOrgId(ctx);

    return await ctx.db.insert("surveys", {
      ...args,
      organizationId: orgId,
    });
  },
});

export const update = mutation({
  args: {
    surveyId: v.id("surveys"),
    ...surveyFields,
  },
  handler: async (ctx, args) => {
    const orgId = await requireOrgId(ctx);

    const { surveyId, ...fields } = args;
    const survey = await ctx.db.get(surveyId);

    if (!survey) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Survey not found" });
    }

    if (survey.organizationId !== orgId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Invalid Organization ID",
      });
    }

    await ctx.db.patch(surveyId, fields);
  },
});

export const setActive = mutation({
  args: {
    surveyId: v.id("surveys"),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const orgId = await requireOrgId(ctx);

    const survey = await ctx.db.get(args.surveyId);

    if (!survey) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Survey not found" });
    }

    if (survey.organizationId !== orgId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Invalid Organization ID",
      });
    }

    await ctx.db.patch(args.surveyId, { isActive: args.isActive });
  },
});

export const remove = mutation({
  args: {
    surveyId: v.id("surveys"),
  },
  handler: async (ctx, args) => {
    const orgId = await requireOrgId(ctx);

    const survey = await ctx.db.get(args.surveyId);

    if (!survey) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Survey not found" });
    }

    if (survey.organizationId !== orgId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Invalid Organization ID",
      });
    }

    // Responses would otherwise be orphaned
    const responses = await ctx.db
      .query("surveyResponses")
      .withIndex("by_survey_id", (q) => q.eq("surveyId", args.surveyId))
      .collect();

    for (const response of responses) {
      await ctx.db.delete(response._id);
    }

    await ctx.db.delete(args.surveyId);
  },
});

export const getResults = query({
  args: {
    surveyId: v.id("surveys"),
  },
  handler: async (ctx, args) => {
    const orgId = await requireOrgId(ctx);

    const survey = await ctx.db.get(args.surveyId);

    if (!survey) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Survey not found" });
    }

    if (survey.organizationId !== orgId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Invalid Organization ID",
      });
    }

    const responses = await ctx.db
      .query("surveyResponses")
      .withIndex("by_survey_id", (q) => q.eq("surveyId", args.surveyId))
      .order("desc")
      .collect();

    const scores = responses
      .map((response) => response.score)
      .filter((score): score is number => typeof score === "number");

    const average =
      scores.length > 0
        ? scores.reduce((total, score) => total + score, 0) / scores.length
        : null;

    // Standard NPS: %promoters (9-10) - %detractors (0-6)
    let nps: number | null = null;
    if (survey.type === "nps" && scores.length > 0) {
      const promoters = scores.filter((score) => score >= 9).length;
      const detractors = scores.filter((score) => score <= 6).length;
      nps = Math.round(((promoters - detractors) / scores.length) * 100);
    }

    const buckets = survey.type === "nps" ? 11 : 5;
    const distribution = Array.from({ length: buckets }, (_, index) => {
      const value = survey.type === "nps" ? index : index + 1;
      return {
        value,
        count: scores.filter((score) => score === value).length,
      };
    });

    return {
      survey,
      total: responses.length,
      average,
      nps,
      distribution,
      responses: responses.slice(0, 50).map((response) => ({
        id: response._id,
        creationTime: response._creationTime,
        score: response.score ?? null,
        comment: response.comment ?? "",
        url: response.metadata?.url ?? "",
      })),
    };
  },
});
