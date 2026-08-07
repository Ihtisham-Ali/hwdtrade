import Fastify from "fastify";
import multipart from "@fastify/multipart";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import path from "path";
import dotenv from "dotenv";
import { inspectionRoutes } from "./api/routes/inspection.routes.js";
import { PdfRenderingService } from "./services/pdf-rendering.service.js";

dotenv.config();

const PORT = parseInt(process.env.PORT || "3000", 10);
const HOST = process.env.HOST || "0.0.0.0";

const fastify = Fastify({
  bodyLimit: 150 * 1024 * 1024, // 150 MB limit for large JSON base64 payloads
  logger: {
    level: process.env.LOG_LEVEL || "info",
  },
});

async function startServer() {
  try {
    // Register plugins
    await fastify.register(cors, { origin: "*" });

    await fastify.register(multipart, {
      limits: {
        fileSize: 30 * 1024 * 1024, // 30 MB per file
        fieldSize: 150 * 1024 * 1024, // 150 MB total fields
        files: 100, // Max 100 image files
      },
    });

    // Serve preview web application from public/
    await fastify.register(fastifyStatic, {
      root: path.join(process.cwd(), "public"),
      prefix: "/",
    });

    // Register API routes
    await fastify.register(inspectionRoutes);

    await fastify.listen({ port: PORT, host: HOST });
    console.log(`\n======================================================`);
    console.log(`🚀 Modern Site Inspection PDF Generator API Running!`);
    console.log(`🌐 Server Address: http://localhost:${PORT}`);
    console.log(`📄 API Endpoint:   POST http://localhost:${PORT}/api/v1/inspection-reports/generate`);
    console.log(`🖥️ Preview UI:     http://localhost:${PORT}/`);
    console.log(`======================================================\n`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

// Graceful shutdown
const gracefulShutdown = async () => {
  console.log("Shutting down server...");
  await PdfRenderingService.closeBrowser();
  await fastify.close();
  process.exit(0);
};

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);

startServer();
