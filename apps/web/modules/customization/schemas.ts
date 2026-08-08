import { z } from "zod";

export const widgetSettingsSchema = z.object({
  greetMessage: z.string().min(1, "Greeting message is required"),
  defaultSuggestions: z.object({
    suggestion1: z.string().optional(),
    suggestion2: z.string().optional(),
    suggestion3: z.string().optional(),
  }),
  // Convex storage id for the uploaded brand logo, empty when none is set
  logoStorageId: z.string().optional(),
});
