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

      // 1. Extract images from imageUrls if provided (RECOMMENDED, LIGHTWEIGHT & SCALABLE!)
      if (metadata.imageUrls) {
        let urlList: any[] = [];
        if (typeof metadata.imageUrls === "string") {
          const rawStr = metadata.imageUrls.trim();
          if (rawStr.startsWith("[") || rawStr.startsWith("{")) {
            try {
              const parsed = JSON.parse(rawStr);
              urlList = Array.isArray(parsed) ? parsed : [parsed];
            } catch (e) {
              urlList = rawStr.split(",").map(u => u.trim());
            }
          } else {
            urlList = rawStr.split(",").map(u => u.trim());
          }
        } else if (Array.isArray(metadata.imageUrls)) {
          urlList = metadata.imageUrls;
        } else if (metadata.imageUrls) {
          urlList = [metadata.imageUrls];
        }

        if (urlList.length > 0) {
          console.log(`[UrlExtract] Downloading ${urlList.length} images from imageUrls...`);
          for (let i = 0; i < urlList.length; i++) {
            const item = urlList[i];
            let urlStr: string | undefined = undefined;
            let caption: string | undefined = undefined;
            let section: string | undefined = undefined;
            let fileName = `photo-${images.length + 1}.jpg`;

            if (typeof item === "string") {
              urlStr = item;
            } else if (typeof item === "object" && item !== null) {
              urlStr = item.url || item.public_url || item.download_url || item.value || item.val ||
                       item.queryParameter?.url || item.queryParameter?.value || item.queryParameter?.public_url;
              caption = item.caption || item.queryParameter?.caption;
              section = item.section || item.queryParameter?.section;
              fileName = item.fileName || item.queryParameter?.fileName || fileName;
            }

            if (urlStr && typeof urlStr === "string" && urlStr.trim().startsWith("http")) {
              const buf = await MultipartService.downloadImageFromUrl(urlStr);
              if (buf) {
                images.push({
                  originalFileName: fileName,
                  mimeType: "image/jpeg",
                  buffer: buf,
                  field: "images"
                });
                if (!metadata.imageMetadata) metadata.imageMetadata = [];
                metadata.imageMetadata.push({
                  fileName,
                  caption,
                  section,
                  sequence: images.length
                });
                console.log(`[UrlExtract] Downloaded photo ${images.length} (${buf.length} bytes) from URL`);
              }
            }
          }
        }
      }

      // 2. Extract base64Images fallback if present
      // Strategy: parse each image object ONE AT A TIME, immediately convert to Buffer,
      // and discard the parsed JSON to avoid accumulating all byte arrays in memory.
      if (typeof metadata.base64Images === "string") {
        const rawStr = (metadata.base64Images as string).trim();
        console.log(`[ImageExtract] base64Images is string, length=${rawStr.length}`);

        // Try standard JSON.parse first (works for single objects or valid arrays)
        let directParsed: any = null;
        try {
          directParsed = JSON.parse(rawStr);
          console.log(`[ImageExtract] JSON.parse OK, type=${typeof directParsed}, isArray=${Array.isArray(directParsed)}`);
        } catch (e: any) {
          // JSON.parse failed — multiple objects concatenated by Make.com
          // Separator is typically ", " (comma+space) between objects
          const posMatch = e.message.match(/position\s+(\d+)/i);
          const errorPos = posMatch ? parseInt(posMatch[1]) : -1;

          if (errorPos > 0 && errorPos < rawStr.length) {
            const bp = rawStr.substring(Math.max(0, errorPos - 3), Math.min(rawStr.length, errorPos + 30));
            console.log(`[ImageExtract] Boundary at pos ${errorPos}: "${bp}"`);
          }

          // Parse objects one-by-one, immediately extract Buffer, discard JSON to save memory
          if (errorPos > 0) {
            console.log(`[ImageExtract] Streaming parse: extracting images one at a time...`);
            let remaining = rawStr;
            let imgIdx = 0;
            let iterations = 0;

            while (remaining.length > 0 && iterations < 100) {
              iterations++;
              // Skip separator characters (commas, whitespace) to find next '{'
              const nextBrace = remaining.indexOf("{");
              if (nextBrace === -1) break;
              if (nextBrace > 0) remaining = remaining.substring(nextBrace);

              let parsedObj: any = null;
              let consumed = remaining.length;

              try {
                parsedObj = JSON.parse(remaining);
                // Successfully parsed entire remaining — this is the last object
              } catch (sliceErr: any) {
                const sm = sliceErr.message.match(/position\s+(\d+)/i);
                if (!sm) break;
                consumed = parseInt(sm[1]);
                if (consumed <= 0) break;
                try {
                  parsedObj = JSON.parse(remaining.substring(0, consumed));
                } catch (e3) {
                  // Skip this chunk
                  remaining = remaining.substring(consumed);
                  continue;
                }
              }

              if (parsedObj) {
                // IMMEDIATELY convert to Buffer — frees the huge JS number array
                const extracted = MultipartService.extractImageFromItem(parsedObj, imgIdx);
                parsedObj = null; // Help GC reclaim the big byte array
                if (extracted) {
                  const buf = extracted.filePart.buffer;
                  const isJpeg = buf.length > 2 && buf[0] === 0xFF && buf[1] === 0xD8;
                  console.log(`[ImageExtract] Image ${imgIdx}: ${buf.length} bytes, JPEG=${isJpeg}`);
                  images.push(extracted.filePart);
                  if (!metadata.imageMetadata) metadata.imageMetadata = [];
                  metadata.imageMetadata.push(extracted.meta);
                }
                imgIdx++;
              }

              if (consumed >= remaining.length) break;
              remaining = remaining.substring(consumed);
            }

            console.log(`[ImageExtract] Extracted ${images.length} images total`);
          }
        }

        // If direct JSON.parse succeeded, process normally
        if (directParsed !== null) {
          let items: any[] = Array.isArray(directParsed) ? directParsed : [directParsed];
          for (let i = 0; i < items.length; i++) {
            const extracted = MultipartService.extractImageFromItem(items[i], i);
            if (extracted) {
              images.push(extracted.filePart);
              if (!metadata.imageMetadata) metadata.imageMetadata = [];
              metadata.imageMetadata.push(extracted.meta);
            }
          }
        }
      }

      console.log(`[ImageExtract] Total images: ${images.length}`);
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

  public static async downloadImageFromUrl(urlStr: string): Promise<Buffer | null> {
    try {
      const cleanUrl = urlStr.trim();
      if (!cleanUrl.startsWith("http")) return null;

      const res = await fetch(cleanUrl, {
        headers: {
          "User-Agent": "HWDTrade-InspectionReportGenerator/1.0"
        }
      });

      if (!res.ok) {
        console.warn(`[UrlDownloader] HTTP ${res.status} when downloading image from ${cleanUrl.substring(0, 80)}...`);
        return null;
      }

      const arrayBuf = await res.arrayBuffer();
      const buf = Buffer.from(arrayBuf);
      if (buf.length > 10) return buf;
    } catch (err: any) {
      console.warn(`[UrlDownloader] Failed to fetch image from ${urlStr}: ${err.message}`);
    }
    return null;
  }
}
