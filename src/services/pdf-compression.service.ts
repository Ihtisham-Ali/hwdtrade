import { InspectionMetadata, UploadedFilePart } from "../schemas/inspection.schema.js";
import { InspectionTemplateConfig } from "../schemas/template.schema.js";
import { CompressionPreset, ImageProcessingService, ProcessedImage } from "./image-processing.service.js";
import { ReportDataService } from "./report-data.service.js";
import { PdfRenderingService } from "./pdf-rendering.service.js";

export interface CompressionResult {
  pdfBuffer: Buffer;
  pdfSizeBytes: number;
  pdfSizeMb: number;
  compressionProfile: CompressionPreset;
  processedImages: ProcessedImage[];
  warnings: Array<{ code: string; message: string }>;
}

export class PdfCompressionService {
  public static async generateOptimisedPdf(
    metadata: InspectionMetadata,
    template: InspectionTemplateConfig,
    uploadedImages: UploadedFilePart[],
    customCoverFile?: UploadedFilePart,
    customLogoFile?: UploadedFilePart
  ): Promise<CompressionResult> {
    const maxPdfSizeMb = metadata.options?.maximumPdfSizeMb || 20;
    const maxPdfSizeBytes = maxPdfSizeMb * 1024 * 1024;

    const passes: CompressionPreset[] = ["high", "balanced", "compressed"];
    const warnings: Array<{ code: string; message: string }> = [];

    // Map image metadata by file name
    const imageMetadataMap = new Map<string, { caption?: string; section?: string; sequence?: number }>();
    if (metadata.imageMetadata) {
      for (const item of metadata.imageMetadata) {
        imageMetadataMap.set(item.fileName, item);
        imageMetadataMap.set(item.fileName.toLowerCase(), item);
      }
    }

    // Process custom cover and logo if present
    let customCoverUri: string | undefined = undefined;
    if (customCoverFile) {
      const processedCover = await ImageProcessingService.processSingleImage(customCoverFile, 0, "high");
      customCoverUri = processedCover.base64DataUri;
    }

    let customLogoUri: string | undefined = undefined;
    if (customLogoFile) {
      const processedLogo = await ImageProcessingService.processSingleImage(customLogoFile, 0, "high");
      customLogoUri = processedLogo.base64DataUri;
    }

    let finalBuffer: Buffer | null = null;
    let finalProfile: CompressionPreset = "high";
    let finalProcessedImages: ProcessedImage[] = [];

    for (let i = 0; i < passes.length; i++) {
      const currentPreset = passes[i];

      const processedImages = await ImageProcessingService.processAllImages(
        uploadedImages,
        currentPreset,
        imageMetadataMap
      );

      const viewModel = ReportDataService.buildViewModel(
        metadata,
        template,
        processedImages,
        customCoverUri,
        customLogoUri
      );

      const pdfBuffer = await PdfRenderingService.generatePdfBuffer(viewModel);
      finalBuffer = pdfBuffer;
      finalProfile = currentPreset;
      finalProcessedImages = processedImages;

      // Check if size is within target
      if (pdfBuffer.length <= maxPdfSizeBytes) {
        break;
      }

      if (i < passes.length - 1) {
        console.warn(
          `[PdfCompressionService] Pass '${currentPreset}' produced ${(pdfBuffer.length / (1024 * 1024)).toFixed(
            2
          )} MB, exceeding ${maxPdfSizeMb} MB limit. Retrying with '${passes[i + 1]}' preset.`
        );
      }
    }

    const pdfSizeBytes = finalBuffer!.length;
    const pdfSizeMb = parseFloat((pdfSizeBytes / (1024 * 1024)).toFixed(2));

    if (pdfSizeBytes > maxPdfSizeBytes) {
      warnings.push({
        code: "PDF_SIZE_TARGET_NOT_REACHED",
        message: `The final PDF size is ${pdfSizeMb} MB, which exceeds the target maximum of ${maxPdfSizeMb} MB even after adaptive compression.`,
      });
    }

    return {
      pdfBuffer: finalBuffer!,
      pdfSizeBytes,
      pdfSizeMb,
      compressionProfile: finalProfile,
      processedImages: finalProcessedImages,
      warnings,
    };
  }
}
