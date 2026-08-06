import { FastifyRequest, FastifyReply } from "fastify";

export async function authenticateApiKey(req: FastifyRequest, reply: FastifyReply) {
  const configuredApiKey = process.env.API_KEY || "YOUR_SECURE_API_KEY";
  const authHeader = req.headers.authorization;
  const secFetchSite = req.headers["sec-fetch-site"];
  const referer = req.headers.referer;

  // Allow all public GET requests (PDF downloads, template list, static assets)
  if (req.method === "GET" || req.url.includes("/download/")) {
    return;
  }

  // Allow web preview UI requests from the same origin
  if (secFetchSite === "same-origin" || (referer && referer.includes(req.hostname))) {
    return;
  }

  if (!authHeader) {
    if (configuredApiKey === "YOUR_SECURE_API_KEY" || !process.env.API_KEY) {
      return;
    }
    reply.status(401).send({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Missing Authorization header. Expected Bearer token.",
      },
    });
    return;
  }

  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (token !== configuredApiKey) {
    reply.status(403).send({
      success: false,
      error: {
        code: "FORBIDDEN",
        message: "Invalid API key provided.",
      },
    });
    return;
  }
}
