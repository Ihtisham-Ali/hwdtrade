/**
 * Test: Reproduce user's exact Make.com payload where base64Images contains URL objects
 */
import { MultipartService } from "../src/services/multipart.service.js";

const sampleUrl = "https://picsum.photos/200";

// User's exact Make.com payload structure
const makeComPayload = {
  reportId: "HSC1-12738265932",
  templateId: "lower-hebel-site-check-1",
  reportTitle: "Test Ali",
  // Notice the field name is "base64Images" and contains concatenated queryParameter objects with URLs
  base64Images: `{"queryParameter":{"name":"url","value":"${sampleUrl}"}}, {"queryParameter":{"name":"url","value":"${sampleUrl}"}}`
};

async function testUserPayload() {
  console.log("=== Testing User Payload Processing ===");

  // Create mock Fastify request
  const mockReq = {
    headers: { "content-type": "application/json" },
    isMultipart: () => false,
    body: makeComPayload
  } as any;

  const result = await MultipartService.parseRequest(mockReq);

  console.log(`Extracted images count: ${result.images.length}`);
  for (let i = 0; i < result.images.length; i++) {
    const img = result.images[i];
    const isJpeg = img.buffer.length > 2 && img.buffer[0] === 0xFF && img.buffer[1] === 0xD8;
    console.log(`Image ${i}: filename=${img.originalFileName}, size=${img.buffer.length} bytes, JPEG=${isJpeg}`);
  }

  if (result.images.length === 2 && result.images[0].buffer.length > 0) {
    console.log("✅ SUCCESS! Payload processed perfectly!");
  } else {
    console.error("❌ FAILED! Expected 2 images downloaded from URLs.");
    process.exit(1);
  }
}

testUserPayload().catch(err => {
  console.error("Test error:", err);
  process.exit(1);
});
