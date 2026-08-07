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

      // Extract base64Images — handle Make.com Array Aggregator output
      if (typeof metadata.base64Images === "string") {
        const rawStr = (metadata.base64Images as string).trim();
        console.log(`[ImageExtract] base64Images is string, length=${rawStr.length}`);

        let parsed: any = null;

        // Try standard JSON.parse first (works for single objects or valid arrays)
        try {
          parsed = JSON.parse(rawStr);
          console.log(`[ImageExtract] JSON.parse OK, type=${typeof parsed}, isArray=${Array.isArray(parsed)}`);
        } catch (e: any) {
          // JSON.parse failed — multiple objects concatenated by Make.com
          const posMatch = e.message.match(/position\s+(\d+)/i);
          const errorPos = posMatch ? parseInt(posMatch[1]) : -1;
          
          // Log the boundary character to understand separator
          if (errorPos > 0 && errorPos < rawStr.length) {
            const boundaryPreview = rawStr.substring(Math.max(0, errorPos - 3), Math.min(rawStr.length, errorPos + 30));
            console.log(`[ImageExtract] JSON.parse failed at pos ${errorPos}, boundary: "${boundaryPreview}"`);
          }

          // Strategy: iteratively parse objects by slicing at JSON.parse error positions
          // This handles ANY separator between objects (comma, space, nothing, etc.)
          if (errorPos > 0) {
            console.log(`[ImageExtract] Parsing concatenated objects using position-based slicing...`);
            const objectArray: any[] = [];
            let remaining = rawStr;
            let iterations = 0;
            const MAX_ITERATIONS = 100; // safety limit

            while (remaining.length > 0 && iterations < MAX_ITERATIONS) {
              iterations++;
              // Skip any non-JSON characters (commas, whitespace, etc.) to find next '{'
              const nextBrace = remaining.indexOf("{");
              if (nextBrace === -1) break;
              if (nextBrace > 0) {
                remaining = remaining.substring(nextBrace);
              }

              try {
                // Try parsing the entire remaining string
                const obj = JSON.parse(remaining);
                objectArray.push(obj);
                break; // Successfully parsed the rest — done
              } catch (sliceErr: any) {
                // Parse failed — extract position of next boundary
                const sliceMatch = sliceErr.message.match(/position\s+(\d+)/i);
                if (!sliceMatch) break;
                const slicePos = parseInt(sliceMatch[1]);
                if (slicePos <= 0) break;

                // Extract the valid JSON chunk before the boundary
                const chunk = remaining.substring(0, slicePos);
                try {
                  objectArray.push(JSON.parse(chunk));
                } catch (e3) {
                  console.warn(`[ImageExtract] Could not parse chunk at iteration ${iterations} (length=${chunk.length})`);
                  // Skip past this position and try to find next object
                }
                remaining = remaining.substring(slicePos);
              }
            }

            if (objectArray.length > 0) {
              console.log(`[ImageExtract] Parsed ${objectArray.length} image objects`);
              parsed = objectArray;
            }
          }
        }

        if (parsed !== null) {
          metadata.base64Images = parsed;
        }
      }

      // Normalize base64Images to an array
      let rawImageItems: any[] = [];
      if (Array.isArray(metadata.base64Images)) {
        rawImageItems = metadata.base64Images;
      } else if (metadata.base64Images && typeof metadata.base64Images !== "string") {
        rawImageItems = [metadata.base64Images];
      }
      console.log(`[ImageExtract] Processing ${rawImageItems.length} image items`);

      for (let i = 0; i < rawImageItems.length; i++) {
        const item = rawImageItems[i];
        const extracted = MultipartService.extractImageFromItem(item, i);
        if (extracted) {
          const buf = extracted.filePart.buffer;
          const isJpeg = buf.length > 2 && buf[0] === 0xFF && buf[1] === 0xD8;
          console.log(`[ImageExtract] Image ${i}: ${buf.length} bytes, JPEG=${isJpeg}, hex=${buf.subarray(0, 8).toString("hex")}`);
          images.push(extracted.filePart);
          if (!metadata.imageMetadata) metadata.imageMetadata = [];
          metadata.imageMetadata.push(extracted.meta);
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

  public static toBuffer(val: any): Buffer | null {
    if (!val) return null;

    if (Buffer.isBuffer(val)) {
      return val.length > 0 ? val : null;
    }

    if (Array.isArray(val)) {
      if (val.length === 0) return null;
      // Array of byte numbers: [255, 216, 255, ...]
      if (typeof val[0] === "number") {
        return Buffer.from(val);
      }
      // If array of objects (e.g. nested objects), try first item
      for (const item of val) {
        const buf = MultipartService.toBuffer(item);
        if (buf && buf.length > 0) return buf;
      }
      return null;
    }

    if (typeof val === "object") {
      // Node.js Buffer object: { type: "Buffer", data: [...] }
      if (val.type === "Buffer" && Array.isArray(val.data)) {
        return Buffer.from(val.data);
      }
      // Nested objects
      if (val.data) {
        const buf = MultipartService.toBuffer(val.data);
        if (buf) return buf;
      }
      if (val.field) {
        const buf = MultipartService.toBuffer(val.field);
        if (buf) return buf;
      }
      if (val.file) {
        const buf = MultipartService.toBuffer(val.file);
        if (buf) return buf;
      }
      if (val.base64) {
        const buf = MultipartService.toBuffer(val.base64);
        if (buf) return buf;
      }
    }

    if (typeof val === "string") {
      let str = val.trim();
      if (!str) return null;

      // Handle Make.com IMTBuffer prefix: "IMTBuffer(...): ffd8ffe0..."
      if (str.includes("IMTBuffer")) {
        const colonIdx = str.lastIndexOf(":");
        if (colonIdx !== -1) str = str.substring(colonIdx + 1).trim();
      }

      // Stripped base64 prefix
      const cleanStr = str.replace(/^data:image\/\w+;base64,/, "").trim();

      // If string is JSON stringified (e.g. '{"type":"Buffer","data":[255,216...]}' or '[255,216...]')
      if (cleanStr.startsWith("{") || cleanStr.startsWith("[")) {
        try {
          const parsed = JSON.parse(cleanStr);
          const buf = MultipartService.toBuffer(parsed);
          if (buf && buf.length > 0) return buf;
        } catch (e) {}
      }

      // Check if Hex string (Make.com IMTBuffer output)
      if (/^[0-9a-fA-F]+$/.test(cleanStr) && cleanStr.length % 2 === 0) {
        return Buffer.from(cleanStr, "hex");
      }

      // Otherwise assume Base64
      try {
        const buf = Buffer.from(cleanStr, "base64");
        // Verify buffer isn't empty and has valid binary data length
        if (buf.length > 10) return buf;
      } catch (e) {}
    }

    return null;
  }

  public static extractImageFromItem(item: any, index: number): { filePart: UploadedFilePart; meta: { fileName: string; caption?: string; section?: string; sequence?: number } } | null {
    if (!item) return null;
    let fileName = `photo-${index + 1}.jpg`;
    let caption: string | undefined = undefined;
    let section: string | undefined = undefined;
    let sequence: number | undefined = index + 1;

    if (typeof item === "object" && !Buffer.isBuffer(item)) {
      fileName = item.fileName || item.file?.fileName || item.field?.fileName || fileName;
      caption = item.caption || item.field?.caption;
      section = item.section || item.field?.section;
      sequence = item.sequence || item.field?.sequence || sequence;
    }

    const buffer = MultipartService.toBuffer(item);
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
