import { createClerkClient } from "@clerk/backend";
import { v } from "convex/values";
import { action } from "../_generated/server";

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY || "",
});

export const validate = action({
  args: {
    organizationId: v.string(),
  },
  handler: async (_, args) => {
    // Clerk throws on an unknown organization rather than returning null, so an
    // unrecognised id has to be caught here - otherwise it reaches the widget as
    // a transport failure and reads as "Unable to verify organization".
    try {
      await clerkClient.organizations.getOrganization({
        organizationId: args.organizationId,
      });

      return { valid: true };
    } catch {
      return {
        valid: false,
        reason: `Organization ${args.organizationId} not found`,
      };
    }
  },
});
