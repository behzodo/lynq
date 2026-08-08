import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";

/**
 * Read-only feed consumed by the embed script on customer websites.
 */
export const getActive = query({
  args: {
    organizationId: v.string(),
    // A plain string on purpose - see the note in public/announcements.ts
    departmentId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const surveys = await ctx.db
      .query("surveys")
      .withIndex("by_organization_id_and_is_active", (q) =>
        q.eq("organizationId", args.organizationId).eq("isActive", true),
      )
      .collect();

    // Surveys with no departmentId belong to the whole organization
    const visible = surveys.filter(
      (survey) =>
        survey.departmentId === undefined ||
        survey.departmentId === args.departmentId,
    );

    return visible.map((survey) => ({
      id: survey._id,
      title: survey.title,
      question: survey.question,
      type: survey.type,
      commentLabel: survey.commentLabel ?? "",
      thankYouMessage: survey.thankYouMessage,
      bgColor: survey.bgColor,
      textColor: survey.textColor,
      position: survey.position,
      delaySeconds: survey.delaySeconds,
    }));
  },
});

const MAX_COMMENT_LENGTH = 2000;

export const submitResponse = mutation({
  args: {
    surveyId: v.id("surveys"),
    score: v.optional(v.number()),
    comment: v.optional(v.string()),
    metadata: v.optional(
      v.object({
        url: v.optional(v.string()),
        userAgent: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const survey = await ctx.db.get(args.surveyId);

    // Only live surveys accept answers - the org id is taken from the survey,
    // never from the caller, so a response can't be attributed to another org.
    if (!survey || !survey.isActive) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Survey not available",
      });
    }

    if (args.score !== undefined) {
      const max = survey.type === "nps" ? 10 : 5;
      const min = survey.type === "nps" ? 0 : 1;

      if (
        !Number.isInteger(args.score) ||
        args.score < min ||
        args.score > max
      ) {
        throw new ConvexError({
          code: "BAD_REQUEST",
          message: "Invalid score",
        });
      }
    }

    return await ctx.db.insert("surveyResponses", {
      surveyId: survey._id,
      organizationId: survey.organizationId,
      score: args.score,
      comment: args.comment?.slice(0, MAX_COMMENT_LENGTH),
      metadata: args.metadata,
    });
  },
});
