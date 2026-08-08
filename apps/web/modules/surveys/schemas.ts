import { z } from "zod";

export const surveySchema = z.object({
  title: z.string().min(1, "Title is required"),
  question: z.string().min(1, "Question is required"),
  type: z.enum(["rating", "nps", "text"]),
  commentLabel: z.string().optional(),
  thankYouMessage: z.string().min(1, "Thank you message is required"),
  bgColor: z.string().min(1),
  textColor: z.string().min(1),
  position: z.enum(["bottom-right", "bottom-left", "center"]),
  delaySeconds: z.coerce.number().min(0).max(600),
  isActive: z.boolean(),
});

export type SurveyFormSchema = z.infer<typeof surveySchema>;

export const DEFAULT_SURVEY: SurveyFormSchema = {
  title: "Quick question",
  question: "How would you rate your experience?",
  type: "rating",
  commentLabel: "Tell us more (optional)",
  thankYouMessage: "Thanks for your feedback! 🙏",
  bgColor: "#111827",
  textColor: "#ffffff",
  position: "bottom-right",
  delaySeconds: 5,
  isActive: true,
};

export const SURVEY_COLOR_PRESETS = [
  { name: "Dark", bgColor: "#111827", textColor: "#ffffff" },
  { name: "Blue", bgColor: "#3b82f6", textColor: "#ffffff" },
  { name: "Green", bgColor: "#16a34a", textColor: "#ffffff" },
  { name: "Purple", bgColor: "#7c3aed", textColor: "#ffffff" },
  { name: "Light", bgColor: "#f3f4f6", textColor: "#111827" },
];

export const SURVEY_TYPE_LABELS: Record<SurveyFormSchema["type"], string> = {
  rating: "Star rating (1-5)",
  nps: "NPS (0-10)",
  text: "Text only",
};
