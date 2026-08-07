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
      if (metadata.base64Images && metadata.base64Images.length > 0) {
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
    if (metadata.base64Images && metadata.base64Images.length > 0) {
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
    let str: string | undefined = undefined;
    let fileName = `photo-${index + 1}.jpg`;
    let caption: string | undefined = undefined;
    let section: string | undefined = undefined;
    let sequence: number | undefined = index + 1;

    if (typeof item === "string") {
      str = item;
    } else if (typeof item === "object") {
      str = item.base64 || item.data || item.file?.data || item.field?.data;
      fileName = item.fileName || item.file?.fileName || item.field?.fileName || fileName;
      caption = item.caption || item.field?.caption;
      section = item.section || item.field?.section;
      sequence = item.sequence || item.field?.sequence || sequence;
    }

    if (!str || typeof str !== "string") return null;

    // Handle Make.com IMTBuffer representation: "IMTBuffer(...): ffd8ffe0..."
    if (str.includes("IMTBuffer")) {
      const colonIdx = str.lastIndexOf(":");
      if (colonIdx !== -1) {
        str = str.substring(colonIdx + 1).trim();
      }
    }

    let buffer: Buffer;

    // Check if string is Hex encoded (Make.com IMTBuffer output)
    const cleanStr = str.replace(/^data:image\/\w+;base64,/, "").trim();
    if (/^[0-9a-fA-F]+$/.test(cleanStr) && cleanStr.length % 2 === 0) {
      buffer = Buffer.from(cleanStr, "hex");
    } else {
      buffer = Buffer.from(cleanStr, "base64");
    }

    if (buffer.length === 0) return null;

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
