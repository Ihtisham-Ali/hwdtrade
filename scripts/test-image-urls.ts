/**
 * Test: Verify imageUrls downloading and metadata parsing
 */
import { MultipartService } from "../src/services/multipart.service.js";

async function testImageUrls() {
  console.log("=== Testing Image URL Extraction & Downloading ===");

  // Public sample image URL
  const testUrl = "https://httpbin.org/image/jpeg";
  
  console.log(`Downloading test image from: ${testUrl}...`);
  const buf = await MultipartService.downloadImageFromUrl(testUrl);

  if (buf && buf.length > 0) {
    console.log(`✅ Success! Downloaded image (${buf.length} bytes), first 4 bytes hex: ${buf.subarray(0, 4).toString("hex")}`);
  } else {
    console.error("❌ Failed to download image from URL");
    process.exit(1);
  }

  console.log("=== DONE ===");
}

testImageUrls().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
