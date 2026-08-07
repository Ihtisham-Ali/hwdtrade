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
          const rawBase64 = item.base64.replace(/^data:image\/\w+;base64,/, "");
          const buffer = Buffer.from(rawBase64, "base64");
          if (buffer.length > 0) {
            const fileName = item.fileName || `photo-${i + 1}.jpg`;
            images.push({
              originalFileName: fileName,
              mimeType: "image/jpeg",
              buffer,
              field: "images",
            });
            // Record in imageMetadata
            if (!metadata.imageMetadata) metadata.imageMetadata = [];
            metadata.imageMetadata.push({
              fileName,
              caption: item.caption,
              section: item.section,
              sequence: item.sequence || i + 1,
            });
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
        const rawBase64 = item.base64.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(rawBase64, "base64");
        if (buffer.length > 0) {
          const fileName = item.fileName || `photo-b64-${i + 1}.jpg`;
          images.push({
            originalFileName: fileName,
            mimeType: "image/jpeg",
            buffer,
            field: "images",
          });
          if (!metadata.imageMetadata) metadata.imageMetadata = [];
          metadata.imageMetadata.push({
            fileName,
            caption: item.caption,
            section: item.section,
            sequence: item.sequence || images.length,
          });
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
}
