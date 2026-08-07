import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import fs from "fs";
import { MultipartService } from "../../services/multipart.service.js";
import { TemplateLoader } from "../../config/template-loader.js";
import { PdfCompressionService } from "../../services/pdf-compression.service.js";
import { StorageService } from "../../services/storage.service.js";
import { authenticateApiKey } from "../middleware/auth.middleware.js";
import { UploadedFilePart } from "../../schemas/inspection.schema.js";

// Cache for idempotency keys
const idempotencyCache = new Map<string, any>();
// Temporary uploads store for fallback method
const tempUploadsStore = new Map<string, UploadedFilePart>();

export async function inspectionRoutes(fastify: FastifyInstance) {
  // Add authentication preHandler hook
  fastify.addHook("preHandler", authenticateApiKey);

  // 1. Primary Multipart Generation Endpoint
  fastify.post("/api/v1/inspection-reports/generate", async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const parsed = await MultipartService.parseRequest(req);
      const { metadata, images, logo, coverImage } = parsed;

      const template = TemplateLoader.getTemplate(metadata.templateId);

      const compressionResult = await PdfCompressionService.generateOptimisedPdf(
        metadata,
        template,
        images,
        coverImage,
        logo
      );

      // Safe filename generation
      const safeReportId = (metadata.reportId || "report").replace(/[^a-zA-Z0-9_-]/g, "_");
      const fileName = `${safeReportId}.pdf`;

      const pdfUrl = StorageService.savePdf(fileName, compressionResult.pdfBuffer);

      const responsePayload = {
        success: true,
        reportId: metadata.reportId,
        fileName,
        pdfUrl: `${req.protocol}://${req.hostname}${pdfUrl}`,
        pdfSizeBytes: compressionResult.pdfSizeBytes,
        pdfSizeMb: compressionResult.pdfSizeMb,
        pageCount: Math.ceil(compressionResult.processedImages.length / 2) + 3,
        receivedImageCount: images.length,
        processedImageCount: compressionResult.processedImages.length,
        failedImageCount: 0,
        compressionProfile: compressionResult.compressionProfile,
        warnings: compressionResult.warnings,
      };

      // Check if client requested binary PDF download directly
      const acceptHeader = req.headers.accept || "";
      const formatQuery = (req.query as any)?.format;

      if (acceptHeader.includes("application/pdf") || formatQuery === "binary") {
        reply.header("Content-Type", "application/pdf");
        reply.header("Content-Disposition", `attachment; filename="${fileName}"`);
        reply.header("X-Report-Id", metadata.reportId);
        reply.header("X-Pdf-Size-Mb", compressionResult.pdfSizeMb.toString());
        reply.header("X-Image-Count", compressionResult.processedImages.length.toString());
        return reply.send(compressionResult.pdfBuffer);
      }

      return reply.send(responsePayload);
    } catch (err: any) {
      req.log.error(err);
      return reply.status(400).send({
        success: false,
        error: {
          code: "GENERATION_FAILED",
          message: err.message || "Failed to generate inspection PDF report.",
        },
      });
    }
  });

  // 2. Fallback Upload Endpoint (Single File Upload)
  fastify.post("/api/v1/inspection-reports/uploads", async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = await req.file();
      if (!data) {
        return reply.status(400).send({ success: false, error: { message: "No file uploaded" } });
      }

      const buffer = await data.toBuffer();
      const uploadId = `upl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      tempUploadsStore.set(uploadId, {
        originalFileName: data.filename,
        mimeType: data.mimetype,
        buffer,
        field: "images",
      });

      return reply.send({
        success: true,
        uploadId,
        fileName: data.filename,
      });
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: { message: err.message } });
    }
  });

  // 3. PDF Download Endpoint
  fastify.get("/api/v1/inspection-reports/download/:fileName", async (req: FastifyRequest, reply: FastifyReply) => {
    const { fileName } = req.params as { fileName: string };
    const filePath = StorageService.getPdfPath(fileName);

    if (!filePath) {
      return reply.status(404).send({ success: false, error: { message: "Report PDF not found." } });
    }

    const stream = fs.createReadStream(filePath);
    reply.header("Content-Type", "application/pdf");
    reply.header("Content-Disposition", `inline; filename="${fileName}"`);
    return reply.send(stream);
  });

  // 4. List Available Inspection Templates
  fastify.get("/api/v1/inspection-reports/templates", async (req: FastifyRequest, reply: FastifyReply) => {
    const templates = TemplateLoader.listAvailableTemplates();
    return reply.send({ success: true, templates });
  });
}
