import { FastifyRequest, FastifyReply } from "fastify";

export async function authenticateApiKey(req: FastifyRequest, reply: FastifyReply) {
  const configuredApiKey = process.env.API_KEY || "YOUR_SECURE_API_KEY";
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    // If no header provided and API_KEY is set to default, allow request for local dev preview
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
