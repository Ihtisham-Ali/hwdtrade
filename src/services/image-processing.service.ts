import sharp from "sharp";
import { UploadedFilePart } from "../schemas/inspection.schema.js";

export type CompressionPreset = "high" | "balanced" | "compressed";

export interface CompressionProfileOptions {
  maxDimension: number;
  jpegQuality: number;
}

export const COMPRESSION_PRESETS: Record<CompressionPreset, CompressionProfileOptions> = {
  high: { maxDimension: 2200, jpegQuality: 78 },
  balanced: { maxDimension: 1800, jpegQuality: 70 },
  compressed: { maxDimension: 1500, jpegQuality: 62 },
};

export interface ProcessedImage {
  id: string;
  originalFileName: string;
  mimeType: string;
  width: number;
  height: number;
  isPortrait: boolean;
  base64DataUri: string;
  sizeBytes: number;
  caption?: string;
  section?: string;
  sequence: number;
}

export class ImageProcessingService {
  public static async processSingleImage(
    filePart: UploadedFilePart,
    sequence: number,
    preset: CompressionPreset = "high",
    metadataOverlay?: { caption?: string; section?: string }
  ): Promise<ProcessedImage> {
    const config = COMPRESSION_PRESETS[preset];

    try {
      const sharpInstance = sharp(filePart.buffer).rotate(); // auto-rotate EXIF
      const metadata = await sharpInstance.metadata();

      const width = metadata.width || 1200;
      const height = metadata.height || 900;
      const isPortrait = height > width;

      const processedBuffer = await sharpInstance
        .resize({
          width: config.maxDimension,
          height: config.maxDimension,
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({
          quality: config.jpegQuality,
          mozjpeg: true,
        })
        .toBuffer();

      const base64Str = processedBuffer.toString("base64");
      const base64DataUri = `data:image/jpeg;base64,${base64Str}`;

      return {
        id: `img_${sequence}_${Date.now()}`,
        originalFileName: filePart.originalFileName,
        mimeType: "image/jpeg",
        width,
        height,
        isPortrait,
        base64DataUri,
        sizeBytes: processedBuffer.length,
        caption: metadataOverlay?.caption,
        section: metadataOverlay?.section,
        sequence,
      };
    } catch (err: any) {
      throw new Error(`Failed to process image '${filePart.originalFileName}': ${err.message}`);
    }
  }

  public static async processAllImages(
    files: UploadedFilePart[],
    preset: CompressionPreset = "high",
    imageMetadataMap: Map<string, { caption?: string; section?: string; sequence?: number }> = new Map()
  ): Promise<ProcessedImage[]> {
    const processed: ProcessedImage[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const meta = imageMetadataMap.get(file.originalFileName) || imageMetadataMap.get(file.originalFileName.toLowerCase());
      const sequence = meta?.sequence || i + 1;

      try {
        const result = await this.processSingleImage(file, sequence, preset, meta);
        processed.push(result);
      } catch (err: any) {
        console.warn(`[ImageProcessingService] Skipping file '${file.originalFileName}': ${err.message}`);
      }
    }

    // Sort by sequence
    processed.sort((a, b) => a.sequence - b.sequence);
    return processed;
  }
}
