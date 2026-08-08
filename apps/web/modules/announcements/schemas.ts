import { z } from "zod";
import { ALL_DEPARTMENTS } from "@/modules/departments/constants";

export const announcementSchema = z.object({
  // ALL_DEPARTMENTS ("all") means organization-wide; mapped to undefined on save
  departmentId: z.string().optional(),
  type: z.enum(["banner", "popup"]),
  title: z.string().min(1, "Title is required"),
  message: z.string().min(1, "Message is required"),
  ctaLabel: z.string().optional(),
  ctaUrl: z.string().optional(),
  bgColor: z.string().min(1),
  textColor: z.string().min(1),
  position: z.enum(["top", "bottom"]),
  dismissible: z.boolean(),
  isActive: z.boolean(),
}).refine(
  (values) => !values.ctaLabel || !!values.ctaUrl,
  { message: "Add a link for the button", path: ["ctaUrl"] },
);

export type AnnouncementFormSchema = z.infer<typeof announcementSchema>;

export const DEFAULT_ANNOUNCEMENT: AnnouncementFormSchema = {
  departmentId: ALL_DEPARTMENTS,
  type: "banner",
  title: "",
  message: "",
  ctaLabel: "",
  ctaUrl: "",
  bgColor: "#171717",
  textColor: "#ffffff",
  position: "top",
  dismissible: true,
  isActive: true,
};

export const COLOR_PRESETS = [
  { name: "Black", bgColor: "#171717", textColor: "#ffffff" },
  { name: "Dark", bgColor: "#111827", textColor: "#ffffff" },
  { name: "Green", bgColor: "#16a34a", textColor: "#ffffff" },
  { name: "Amber", bgColor: "#f59e0b", textColor: "#111827" },
  { name: "Red", bgColor: "#dc2626", textColor: "#ffffff" },
  { name: "Light", bgColor: "#f3f4f6", textColor: "#111827" },
];
