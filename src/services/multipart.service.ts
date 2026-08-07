import { FastifyRequest } from "fastify";
import { InspectionMetadata, InspectionMetadataSchema, UploadedFilePart } from "../schemas/inspection.schema.js";

export interface ParsedMultipartRequest {
  metadata: InspectionMetadata;
  images: UploadedFilePart[];
  logo?: UploadedFilePart;
  coverImage?: UploadedFilePart;
}

export class MultipartService {
  public static async parseRequest(req: FastifyRequest): Promise<ParsedMultipartRequest> {
    const contentType = req.headers["content-type"] || "";
    const images: UploadedFilePart[] = [];
    let logo: UploadedFilePart | undefined = undefined;
    let coverImage: UploadedFilePart | undefined = undefined;
    let metadata: InspectionMetadata;

    // Handle Application/JSON Direct Requests
    if (contentType.includes("application/json") || (!req.isMultipart() && req.body)) {
      const body = req.body as any;
      const rawMeta = body.metadata ? (typeof body.metadata === "string" ? JSON.parse(body.metadata) : body.metadata) : body;
      metadata = InspectionMetadataSchema.parse(rawMeta);

      // Extract base64Images if present
      if (typeof metadata.base64Images === "string") {
        try {
          metadata.base64Images = JSON.parse(metadata.base64Images);
        } catch (e) {}
      }

      // Normalize base64Images to an array if it's a single object or string
      let rawImageItems: any[] = [];
      if (Array.isArray(metadata.base64Images)) {
        rawImageItems = metadata.base64Images;
      } else if (metadata.base64Images) {
        rawImageItems = [metadata.base64Images];
      }

      if (rawImageItems.length > 0) {
        for (let i = 0; i < rawImageItems.length; i++) {
          const item = rawImageItems[i];
          const extracted = MultipartService.extractImageFromItem(item, i);
          if (extracted) {
            images.push(extracted.filePart);
            if (!metadata.imageMetadata) metadata.imageMetadata = [];
            metadata.imageMetadata.push(extracted.meta);
          }
        }
      }

      return { metadata, images, logo, coverImage };
    }

    // Handle Multipart/Form-Data Requests
    if (!req.isMultipart()) {
      throw new Error("Request must be multipart/form-data or application/json");
    }

    const parts = req.parts();
    let rawMetadataStr: string | null = null;

    for await (const part of parts) {
      if (part.type === "field") {
        if (part.fieldname === "metadata") {
          rawMetadataStr = part.value as string;
        }
      } else if (part.type === "file") {
        const buffer = await part.toBuffer();
        if (buffer.length === 0) continue;

        const filePart: UploadedFilePart = {
          originalFileName: part.filename || `file-${Date.now()}`,
          mimeType: part.mimetype || "application/octet-stream",
          buffer,
          field: part.fieldname as any,
        };

        if (part.fieldname === "images" || part.fieldname === "images[]" || part.fieldname.startsWith("images")) {
          images.push(filePart);
        } else if (part.fieldname === "logo") {
          logo = filePart;
        } else if (part.fieldname === "coverImage") {
          coverImage = filePart;
        } else {
          // If field name is generic (e.g. 'file', 'attachment', 'data'), add to images
          images.push(filePart);
        }
      }
    }

    if (!rawMetadataStr) {
      throw new Error("Missing required field 'metadata'.");
    }

    let parsedJson: any;
    try {
      parsedJson = JSON.parse(rawMetadataStr);
    } catch (e: any) {
      throw new Error(`Invalid JSON format in 'metadata' field: ${e.message}`);
    }

    metadata = InspectionMetadataSchema.parse(parsedJson);

    // Extract base64Images from metadata if present
    if (typeof metadata.base64Images === "string") {
      try {
        metadata.base64Images = JSON.parse(metadata.base64Images);
      } catch (e) {}
    }

    if (Array.isArray(metadata.base64Images) && metadata.base64Images.length > 0) {
      for (let i = 0; i < metadata.base64Images.length; i++) {
        const item = metadata.base64Images[i];
        const extracted = MultipartService.extractImageFromItem(item, i);
        if (extracted) {
          images.push(extracted.filePart);
          if (!metadata.imageMetadata) metadata.imageMetadata = [];
          metadata.imageMetadata.push(extracted.meta);
        }
      }
    }

    return {
      metadata,
      images,
      logo,
      coverImage,
    };
  }

  public static extractImageFromItem(item: any, index: number): { filePart: UploadedFilePart; meta: { fileName: string; caption?: string; section?: string; sequence?: number } } | null {
    if (!item) return null;
    let fileName = `photo-${index + 1}.jpg`;
    let caption: string | undefined = undefined;
    let section: string | undefined = undefined;
    let sequence: number | undefined = index + 1;
    let rawTarget: any = item;

    if (typeof item === "object") {
      fileName = item.fileName || item.file?.fileName || item.field?.fileName || fileName;
      caption = item.caption || item.field?.caption;
      section = item.section || item.field?.section;
      sequence = item.sequence || item.field?.sequence || sequence;

      if (item.field) rawTarget = item.field.data || item.field.base64 || item.field;
      else if (item.file) rawTarget = item.file.data || item.file.base64 || item.file;
      else if (item.base64) rawTarget = item.base64;
      else if (item.data) rawTarget = item.data;
    }

    let buffer: Buffer | null = null;

    // 1. Direct Buffer instance
    if (Buffer.isBuffer(rawTarget)) {
      buffer = rawTarget;
    }
    // 2. Node.js serialized Buffer object: { type: "Buffer", data: [255, 216, 255, ...] }
    else if (rawTarget && typeof rawTarget === "object" && Array.isArray(rawTarget.data)) {
      buffer = Buffer.from(rawTarget.data);
    }
    // 3. Raw array of byte numbers: [255, 216, 255, ...]
    else if (Array.isArray(rawTarget)) {
      buffer = Buffer.from(rawTarget);
    }
    // 4. String format (Hex, Base64, IMTBuffer, or stringified JSON object)
    else if (typeof rawTarget === "string") {
      let str = rawTarget;
      if (str.includes("IMTBuffer")) {
        const colonIdx = str.lastIndexOf(":");
        if (colonIdx !== -1) {
          str = str.substring(colonIdx + 1).trim();
        }
      }
      const cleanStr = str.replace(/^data:image\/\w+;base64,/, "").trim();
      if (/^[0-9a-fA-F]+$/.test(cleanStr) && cleanStr.length % 2 === 0) {
        buffer = Buffer.from(cleanStr, "hex");
      } else {
        buffer = Buffer.from(cleanStr, "base64");
      }
    }

    if (!buffer || buffer.length === 0) return null;

    return {
      filePart: {
        originalFileName: fileName,
        mimeType: "image/jpeg",
        buffer,
        field: "images",
      },
      meta: {
        fileName,
        caption,
        section,
        sequence,
      },
    };
  }
}
