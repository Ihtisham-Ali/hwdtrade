/**
 * Test: Reproduce user's exact Make.com payload for imageUrls
 */
import { MultipartService } from "../src/services/multipart.service.js";

const sampleUrl = "https://picsum.photos/200";

// User's exact Make.com payload string format
const exactUserString = `{"queryParameter":{"name":"url","value":"${sampleUrl}"}}, {"queryParameter":{"name":"url","value":"${sampleUrl}"}}, {"queryParameter":{"name":"url","value":"${sampleUrl}"}}`;

const makeComPayload = {
  reportId: "HSC1-12738265932",
  templateId: "lower-hebel-site-check-1",
  reportTitle: "Test Ali",
  imageUrls: exactUserString
};

async function testUserImageUrlsPayload() {
  console.log("=== Testing Exact User imageUrls Payload ===");
  console.log("Input imageUrls string length:", exactUserString.length);

  // Test helper function directly
  const parsedItems = MultipartService.parseConcatenatedJsonObjects(exactUserString);
  console.log(`parseConcatenatedJsonObjects output count: ${parsedItems.length}`);

  // Test mock Fastify request
  const mockReq = {
    headers: { "content-type": "application/json" },
    isMultipart: () => false,
    body: makeComPayload
  } as any;

  const result = await MultipartService.parseRequest(mockReq);
  console.log(`Total images extracted in parseRequest: ${result.images.length}`);

  for (let i = 0; i < result.images.length; i++) {
    const img = result.images[i];
    const isJpeg = img.buffer.length > 2 && img.buffer[0] === 0xFF && img.buffer[1] === 0xD8;
    console.log(`  Image ${i}: size=${img.buffer.length} bytes, JPEG=${isJpeg}`);
  }

  if (result.images.length === 3 && result.images[0].buffer.length > 0) {
    console.log("✅ SUCCESS! All 3 images parsed and downloaded!");
  } else {
    console.error("❌ FAILED! Expected 3 images downloaded.");
    process.exit(1);
  }
}

testUserImageUrlsPayload().catch(err => {
  console.error("Test error:", err);
  process.exit(1);
});
