import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { assertDepartmentInOrg } from "./departments";

const surveyFields = {
  // Absent means every department - see the schema comment
  departmentId: v.optional(v.id("departments")),
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

/**
 * The org id if the caller has one, otherwise null. Reads use this so they can
 * return an empty list during the window where Convex auth has not caught up
 * with Clerk yet - a component mounting mid org switch is not an error.
 */
async function getOrgId(ctx: {
  auth: { getUserIdentity: () => Promise<unknown> };
}) {
  const identity = (await ctx.auth.getUserIdentity()) as {
    orgId?: string;
  } | null;

  return identity?.orgId ?? null;
}

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
    const orgId = await getOrgId(ctx);

    if (orgId === null) {
      return [];
    }

    const surveys = await ctx.db
      .query("surveys")
      .withIndex("by_organization_id", (q) => q.eq("organizationId", orgId))
      .order("desc")
      .collect();

    // The list shows headline numbers per survey, and the responses are
    // already loaded to count them, so summarise them in the same pass.
    return await Promise.all(
      surveys.map(async (survey) => {
        const responses = await ctx.db
          .query("surveyResponses")
          .withIndex("by_survey_id", (q) => q.eq("surveyId", survey._id))
          .collect();

        const scores = responses
          .map((response) => response.score)
          .filter((score): score is number => typeof score === "number");

        const average =
          scores.length > 0
            ? scores.reduce((total, score) => total + score, 0) / scores.length
            : null;

        let nps: number | null = null;
        if (survey.type === "nps" && scores.length > 0) {
          const promoters = scores.filter((score) => score >= 9).length;
          const detractors = scores.filter((score) => score <= 6).length;
          nps = Math.round(((promoters - detractors) / scores.length) * 100);
        }

        const lastResponseAt = responses.reduce(
          (latest, response) => Math.max(latest, response._creationTime),
          0,
        );

        return {
          ...survey,
          responseCount: responses.length,
          commentCount: responses.filter((response) => response.comment).length,
          average,
          nps,
          lastResponseAt: lastResponseAt || null,
        };
      }),
    );
  },
});

export const create = mutation({
  args: surveyFields,
  handler: async (ctx, args) => {
    const orgId = await requireOrgId(ctx);
    await assertDepartmentInOrg(ctx, args.departmentId, orgId);

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

    await assertDepartmentInOrg(ctx, fields.departmentId, orgId);

    // departmentId: undefined clears the field, moving it back to all departments
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
