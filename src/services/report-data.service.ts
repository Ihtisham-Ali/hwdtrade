import fs from "fs";
import path from "path";
import { InspectionMetadata } from "../schemas/inspection.schema.js";
import { InspectionTemplateConfig } from "../schemas/template.schema.js";
import { NormalisedStatus, StatusNormaliserService } from "./status-normaliser.service.js";
import { ProcessedImage } from "./image-processing.service.js";
import { DEFAULT_HWD_LOGO_DATA_URI } from "../config/default-logo.js";

export interface QuestionViewModel {
  id: string;
  label: string;
  description?: string;
  responseKey: string;
  rawResponse: string;
  status: NormalisedStatus;
  isFullWidth: boolean;
  isNote: boolean;
  type: string;
}

export interface SectionViewModel {
  id: string;
  title: string;
  description?: string;
  questions: QuestionViewModel[];
}

export interface OutstandingItemViewModel {
  itemNumber: string;
  sectionTitle: string;
  questionLabel: string;
  rawResponse: string;
  status: NormalisedStatus;
  requiredAction: string;
  isCrit: boolean;
}

export interface SummaryStatsViewModel {
  totalChecks: number;
  completedCount: number;
  correctCount: number;
  attentionCount: number;
  cannotInstallCount: number;
  notRequiredCount: number;
  orderedCount: number;
  totalPhotos: number;
  overallStatus: "COMPLIANT" | "ATTENTION REQUIRED" | "ACTION REQUIRED";
  overallStatusClass: string;
  recommendedAction: string;
  isCompliant: boolean;
}

export interface DetailPageViewModel {
  pageNumber: number;
  sections: SectionViewModel[];
}

export interface ReportViewModel {
  metadata: InspectionMetadata;
  template: InspectionTemplateConfig;
  stats: SummaryStatsViewModel;
  sections: SectionViewModel[];
  detailPages: DetailPageViewModel[];
  outstandingItems: OutstandingItemViewModel[];
  summaryOutstandingItems: OutstandingItemViewModel[];
  coverImageUri?: string;
  coverBgFlatUri?: string;
  logoUri?: string;
  galleryPages: {
    pageNumber: number;
    photos: ProcessedImage[];
  }[];
  generalNotesList: string[];
  formattedDate: string;
  introductionText: string;
}

export class ReportDataService {
  public static buildViewModel(
    metadata: InspectionMetadata,
    template: InspectionTemplateConfig,
    processedImages: ProcessedImage[],
    customCoverUri?: string,
    customLogoUri?: string
  ): ReportViewModel {
    const responses = metadata.responses || {};
    const sections: SectionViewModel[] = [];
    const outstandingItems: OutstandingItemViewModel[] = [];

    let totalChecks = 0;
    let completedCount = 0;
    let correctCount = 0;
    let attentionCount = 0;
    let cannotInstallCount = 0;
    let notRequiredCount = 0;
    let orderedCount = 0;

    let outstandingIndex = 1;

    for (const sec of template.sections) {
      const questionVMs: QuestionViewModel[] = [];

      for (const q of sec.questions) {
        totalChecks++;
        const rawAns = responses[q.responseKey];
        const status = StatusNormaliserService.normalise(rawAns);

        // Stats counter
        // The dashboard's "COMPLETED" tile is a single non-issue bucket: any
        // answer that isn't flagged as needing attention or cannot-install
        // counts toward it (Completed, Complete, Correct, Not Required,
        // Ordered, or plain informational answers), regardless of report type.
        switch (status.category) {
          case "attention":
          case "partially_completed":
            attentionCount++;
            break;
          case "cannot_install":
            cannotInstallCount++;
            break;
          case "unknown":
            // Not answered — excluded from every bucket
            break;
          default:
            completedCount++;
            if (status.category === "correct") correctCount++;
            else if (status.category === "not_required") notRequiredCount++;
            else if (status.category === "ordered") orderedCount++;
            break;
        }

        // Outstanding item check
        if (status.requiresAction) {
          let actionText = "Rectify or complete item prior to next inspection.";
          if (q.responseKey.includes("Notes") || responses[`${q.responseKey}Notes`]) {
            actionText = responses[`${q.responseKey}Notes`] || actionText;
          } else if (status.category === "cannot_install") {
            actionText = "Investigate site boundary or obstruction; arrange temporary access platform if required.";
          }

          outstandingItems.push({
            itemNumber: String(outstandingIndex++).padStart(2, "0"),
            sectionTitle: sec.title,
            questionLabel: q.label,
            rawResponse: status.displayLabel,
            status,
            requiredAction: actionText,
            isCrit: status.category === "cannot_install",
          });
        }

        const isNote = q.type === "notes" || q.responseKey.endsWith("Notes");

        questionVMs.push({
          id: q.id,
          label: q.label,
          description: q.description,
          responseKey: q.responseKey,
          rawResponse: status.displayLabel,
          status,
          isFullWidth: q.isFullWidth || isNote || false,
          isNote,
          type: q.type || "choice",
        });
      }

      sections.push({
        id: sec.id,
        title: sec.title,
        description: sec.description,
        questions: questionVMs,
      });
    }

    // Overall Status
    let overallStatus: "COMPLIANT" | "ATTENTION REQUIRED" | "ACTION REQUIRED" = "COMPLIANT";
    let overallStatusClass = "status-success";
    let recommendedAction = "Site is compliant. Proceed to next construction phase.";
    let isCompliant = true;

    if (cannotInstallCount > 0) {
      overallStatus = "ACTION REQUIRED";
      overallStatusClass = "status-danger";
      recommendedAction = "Critical installation blockers identified. Complete outstanding actions immediately.";
      isCompliant = false;
    } else if (attentionCount > 0) {
      overallStatus = "ATTENTION REQUIRED";
      overallStatusClass = "status-warning";
      recommendedAction = "Minor non-compliant items identified. Rectify before scheduling next site check.";
      isCompliant = false;
    }

    const stats: SummaryStatsViewModel = {
      totalChecks,
      completedCount,
      correctCount,
      attentionCount,
      cannotInstallCount,
      notRequiredCount,
      orderedCount,
      totalPhotos: processedImages.length,
      overallStatus,
      overallStatusClass,
      recommendedAction,
      isCompliant,
    };

    // Cover Background Flat: Default flat cover background
    let coverBgFlatUri: string | undefined = undefined;
    try {
      const defaultBgPath = path.join(process.cwd(), "public", "cover_bg_flat.png");
      if (fs.existsSync(defaultBgPath)) {
        const bgBuffer = fs.readFileSync(defaultBgPath);
        coverBgFlatUri = `data:image/png;base64,${bgBuffer.toString("base64")}`;
      }
    } catch (e) {}

    // Cover Image: Custom uploaded cover -> or 1st processed image -> or fallback undefined
    let coverImageUri = customCoverUri;
    if (!coverImageUri && processedImages.length > 0) {
      coverImageUri = processedImages[0].base64DataUri;
    }

    // General Notes List
    let generalNotesList: string[] = [];
    const notesRaw = metadata.generalNotes as any;
    if (Array.isArray(notesRaw)) {
      generalNotesList = notesRaw.filter((n: any) => n && typeof n === "string" && n.trim().length > 0);
    } else if (typeof notesRaw === "string" && notesRaw.trim().length > 0) {
      generalNotesList = [notesRaw.trim()];
    }

    // Photo Gallery Paging (2 photos per page)
    const galleryPages: { pageNumber: number; photos: ProcessedImage[] }[] = [];
    for (let i = 0; i < processedImages.length; i += 2) {
      const chunk = processedImages.slice(i, i + 2);
      galleryPages.push({
        pageNumber: Math.floor(i / 2) + 1,
        photos: chunk,
      });
    }

    // Introduction Text
    const address = metadata.property.fullAddress || `${metadata.property.addressLine}, ${metadata.property.suburb}`;
    const introductionText = `The ${metadata.reportTitle} inspection at ${address} has been completed for ${metadata.reportType}. This report summarises the current site conditions, completed inspection items, outstanding requirements, and supporting photographic evidence. Items requiring attention are highlighted throughout the report and should be completed before the next site check.`;

    // Default Logo: Custom logo URI -> file system -> embedded DEFAULT_HWD_LOGO_DATA_URI
    let logoUri = customLogoUri || (metadata.branding?.logoUrl && metadata.branding.logoUrl.startsWith("data:image/") ? metadata.branding.logoUrl : undefined);

    if (!logoUri || !logoUri.startsWith("data:image/")) {
      try {
        const defaultLogoPath = path.join(process.cwd(), "public", "logo.png");
        if (fs.existsSync(defaultLogoPath)) {
          const logoBuffer = fs.readFileSync(defaultLogoPath);
          logoUri = `data:image/png;base64,${logoBuffer.toString("base64")}`;
        }
      } catch (e) {
        // Fallback if file read fails
      }
    }

    if (!logoUri || !logoUri.startsWith("data:image/")) {
      logoUri = DEFAULT_HWD_LOGO_DATA_URI;
    }

    // Detail Pages Paging (2 sections per page for clean A4 pagination)
    const detailPages: DetailPageViewModel[] = [];
    for (let i = 0; i < sections.length; i += 2) {
      const chunk = sections.slice(i, i + 2);
      detailPages.push({
        pageNumber: Math.floor(i / 2) + 1,
        sections: chunk,
      });
    }

    return {
      metadata,
      template,
      stats,
      sections,
      detailPages,
      outstandingItems,
      summaryOutstandingItems: outstandingItems.slice(0, 2),
      coverImageUri,
      coverBgFlatUri,
      logoUri,
      galleryPages,
      generalNotesList,
      formattedDate: metadata.checkDate || new Date().toLocaleDateString("en-AU"),
      introductionText,
    };
  }
}
