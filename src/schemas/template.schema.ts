import { z } from "zod";

export const TemplateQuestionSchema = z.object({
  id: z.string(),
  label: z.string(),
  responseKey: z.string(),
  description: z.string().optional(),
  type: z.enum(["choice", "text", "notes", "number"]).optional().default("choice"),
  isFullWidth: z.boolean().optional().default(false),
});

export const TemplateSectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  questions: z.array(TemplateQuestionSchema),
});

export const InspectionTemplateConfigSchema = z.object({
  templateId: z.string(),
  title: z.string(),
  version: z.string().optional().default("1.0.0"),
  description: z.string().optional(),
  sections: z.array(TemplateSectionSchema),
});

export type InspectionTemplateConfig = z.infer<typeof InspectionTemplateConfigSchema>;
export type TemplateSection = z.infer<typeof TemplateSectionSchema>;
export type TemplateQuestion = z.infer<typeof TemplateQuestionSchema>;
