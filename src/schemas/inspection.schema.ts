import { z } from "zod";

export const PropertySchema = z.object({
  lotNumber: z.string().optional().default(""),
  addressLine: z.string().optional().default(""),
  suburb: z.string().optional().default(""),
  postcode: z.string().optional().default(""),
  fullAddress: z.string().min(1, "Full address is required"),
});

export const InspectorSchema = z.object({
  name: z.string().optional().default("Site Inspector"),
  company: z.string().optional().default("Inspection Services"),
});

export const BrandingSchema = z.object({
  companyName: z.string().optional().default("HWD Trade"),
  primaryColour: z.string().optional().default("#0F172A"),
  accentColour: z.string().optional().default("#00AEEF"),
  secondaryColour: z.string().optional().default("#14B8A6"),
  logoUrl: z.string().optional(),
});

export const ImageMetadataSchema = z.object({
  fileName: z.string(),
  caption: z.string().optional(),
  section: z.string().optional(),
  sequence: z.number().optional(),
});

export const InspectionOptionsSchema = z.object({
  includeCoverPage: z.boolean().optional().default(true),
  includeSummary: z.boolean().optional().default(true),
  includeOutstandingItems: z.boolean().optional().default(true),
  includePhotographs: z.boolean().optional().default(true),
  includeImageCaptions: z.boolean().optional().default(true),
  includePageNumbers: z.boolean().optional().default(true),
  maximumPdfSizeMb: z.number().optional().default(20),
});

export const SourceMetadataSchema = z.object({
  platform: z.string().optional().default("monday.com"),
  boardId: z.string().optional(),
  itemId: z.string().optional(),
});

export const InspectionMetadataSchema = z.object({
  reportId: z.string().optional().default(() => `RPT-${Date.now()}`),
  templateId: z.string().optional().default("lower-hebel-site-check-1"),
  reportTitle: z.string().optional().default("Site Inspection Report"),
  reportType: z.string().optional().default("Lower Hebel Installation"),
  builder: z.string().optional().default("N/A"),
  checkDate: z.string().optional().default(() => new Date().toLocaleDateString("en-AU")),
  siteChecksCompleted: z.string().optional(),
  property: PropertySchema,
  inspector: InspectorSchema.optional().default({ name: "Site Inspector", company: "Inspection Services" }),
  branding: BrandingSchema.optional().default({
    companyName: "Site Inspection Co.",
    primaryColour: "#0F172A",
    accentColour: "#00AEEF",
    secondaryColour: "#14B8A6"
  }),
  responses: z.record(z.string(), z.string()).optional().default({}),
  generalNotes: z.union([z.array(z.string()), z.string()]).optional().default([]),
  imageMetadata: z.array(ImageMetadataSchema).optional().default([]),
  options: InspectionOptionsSchema.optional().default({
    includeCoverPage: true,
    includeSummary: true,
    includeOutstandingItems: true,
    includePhotographs: true,
    includeImageCaptions: true,
    includePageNumbers: true,
    maximumPdfSizeMb: 20
  }),
  sourceMetadata: SourceMetadataSchema.optional(),
});

export type InspectionMetadata = z.infer<typeof InspectionMetadataSchema>;
export type UploadedFilePart = {
  originalFileName: string;
  mimeType: string;
  buffer: Buffer;
  field: "images" | "logo" | "coverImage";
};
