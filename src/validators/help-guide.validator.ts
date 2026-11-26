import { z } from "zod";
import {
  HELP_GUIDE_NOTES_LIMIT,
  HELP_GUIDE_SECTIONS_LIMIT,
  HELP_GUIDE_STEPS_LIMIT,
  HELP_GUIDE_SUMMARY_MAX_LENGTH,
  HELP_GUIDE_TEXT_MAX_LENGTH,
  HELP_GUIDE_TITLE_MAX_LENGTH,
  HELP_GUIDE_URL_MAX_LENGTH,
} from "@/lib/constants";
import { isRecordingUrl } from "@/lib/user-guides/recording";

/** The whole guide, as the Help Guides editor saves it. */

const text = (max: number, label: string) =>
  z
    .string()
    .trim()
    .min(1, `Enter ${label}.`)
    .max(max, `Use ${max} characters or fewer.`);

const stepSchema = z.object({
  text: text(HELP_GUIDE_TEXT_MAX_LENGTH, "the step"),
  imageId: z.string().min(1).max(64).nullable(),
  imageUrl: z
    .string()
    .max(HELP_GUIDE_URL_MAX_LENGTH)
    .refine((value) => value.startsWith("/") && !value.startsWith("//"), "Use a path on this site.")
    .nullish(),
});

const sectionSchema = z.object({
  id: z.string().min(1).max(40),
  title: text(HELP_GUIDE_TITLE_MAX_LENGTH, "a section title"),
  intro: z.string().trim().max(HELP_GUIDE_TEXT_MAX_LENGTH).optional(),
  steps: z.array(stepSchema).max(HELP_GUIDE_STEPS_LIMIT, `Use ${HELP_GUIDE_STEPS_LIMIT} steps or fewer.`),
  notes: z
    .array(text(HELP_GUIDE_TEXT_MAX_LENGTH, "the note"))
    .max(HELP_GUIDE_NOTES_LIMIT, `Use ${HELP_GUIDE_NOTES_LIMIT} notes or fewer.`),
});

const recordingSchema = z
  .string()
  .trim()
  .max(HELP_GUIDE_URL_MAX_LENGTH, `Use ${HELP_GUIDE_URL_MAX_LENGTH} characters or fewer.`)
  .refine((value) => value === "" || isRecordingUrl(value), {
    message: "Use an https link to a video file ending in .mp4 or .webm.",
  })
  .transform((value) => (value === "" ? null : value))
  .nullable();

export const helpGuideSchema = z
  .object({
    title: text(HELP_GUIDE_TITLE_MAX_LENGTH, "a title"),
    summary: text(HELP_GUIDE_SUMMARY_MAX_LENGTH, "a summary"),
    recordingUrl: recordingSchema,
    sections: z
      .array(sectionSchema)
      .min(1, "Keep at least one section.")
      .max(HELP_GUIDE_SECTIONS_LIMIT, `Use ${HELP_GUIDE_SECTIONS_LIMIT} sections or fewer.`),
  })
  .refine((guide) => new Set(guide.sections.map((section) => section.id)).size === guide.sections.length, {
    message: "Each section needs its own id.",
    path: ["sections"],
  });

export type HelpGuideInput = z.infer<typeof helpGuideSchema>;

export const helpGuideParamsSchema = z.object({
  audience: z.enum(["customer", "admin"]),
  slug: z.string().min(1).max(60),
});
