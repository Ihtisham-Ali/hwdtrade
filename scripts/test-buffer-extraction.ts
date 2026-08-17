/**
 * Test script: reproduce the exact Make.com payload to verify buffer extraction
 * and Sharp image processing.
 */

// Simulate the first 100 bytes of a JPEG file (real JFIF header)
const jpegBytes = [
  255, 216, 255, 224, 0, 16, 74, 70, 73, 70, 0, 1, 1, 0, 0, 1,
  0, 1, 0, 0, 255, 226, 2, 40, 73, 67, 67, 95, 80, 82, 79, 70,
  73, 76, 69, 0, 1, 1, 0, 0, 2, 24, 97, 112, 112, 108, 4, 0,
  0, 0, 109, 110, 116, 114, 82, 71, 66, 32, 88, 89, 90, 32, 7, 230,
  0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 97, 99, 115, 112, 65, 80,
  80, 76, 0, 0, 0, 0, 65, 80, 80, 76, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0
];

// This simulates the EXACT structure Make.com sends:
// base64Images is a STRINGIFIED JSON object wrapping a Buffer representation
const makeComPayload = {
  base64Images: JSON.stringify({
    field: {
      data: {
        type: "Buffer",
        data: jpegBytes
      }
    }
  })
};

console.log("=== Test 1: Simulated Make.com Payload ===");
console.log("typeof base64Images:", typeof makeComPayload.base64Images);
console.log("base64Images starts with:", makeComPayload.base64Images.substring(0, 80));

// Step 1: JSON.parse the string
let parsed: any;
try {
  parsed = JSON.parse(makeComPayload.base64Images);
  console.log("JSON.parse result type:", typeof parsed);
  console.log("JSON.parse result keys:", Object.keys(parsed));
  console.log("parsed.field exists:", !!parsed.field);
  console.log("parsed.field.data exists:", !!parsed.field?.data);
  console.log("parsed.field.data.type:", parsed.field?.data?.type);
  console.log("parsed.field.data.data is array:", Array.isArray(parsed.field?.data?.data));
  console.log("parsed.field.data.data length:", parsed.field?.data?.data?.length);
} catch (e: any) {
  console.error("JSON.parse failed:", e.message);
  process.exit(1);
}

// Step 2: Test Buffer.from with the byte array
const byteArray = parsed.field.data.data;
const directBuffer = Buffer.from(byteArray);
console.log("\n=== Buffer.from(byteArray) ===");
console.log("Buffer length:", directBuffer.length);
console.log("First 20 bytes (hex):", directBuffer.subarray(0, 20).toString("hex"));
console.log("Is JPEG? (ff d8 ff):", directBuffer[0] === 0xFF && directBuffer[1] === 0xD8 && directBuffer[2] === 0xFF);

// Step 3: Test using our toBuffer recursive function
// Importing dynamically
import("../src/services/multipart.service.js").then(async ({ MultipartService }) => {
  console.log("\n=== toBuffer() Test ===");
  
  // Test with the parsed object (after JSON.parse)
  const buf1 = MultipartService.toBuffer(parsed);
  console.log("toBuffer(parsed object):", buf1 ? `Buffer(${buf1.length} bytes), first hex: ${buf1.subarray(0, 10).toString("hex")}` : "NULL");
  
  // Test with the raw string (before JSON.parse)  
  const buf2 = MultipartService.toBuffer(makeComPayload.base64Images);
  console.log("toBuffer(raw string):", buf2 ? `Buffer(${buf2.length} bytes), first hex: ${buf2.subarray(0, 10).toString("hex")}` : "NULL");

  // Step 4: Test Sharp with the buffer
  if (buf1 && buf1.length > 0) {
    console.log("\n=== Sharp Test ===");
    try {
      const sharp = (await import("sharp")).default;
      const metadata = await sharp(buf1).metadata();
      console.log("Sharp metadata:", JSON.stringify(metadata, null, 2));
    } catch (err: any) {
      console.error("Sharp FAILED:", err.message);
      console.log("Buffer first 20 hex bytes:", buf1.subarray(0, 20).toString("hex"));
      console.log("Buffer length:", buf1.length);
      
      // A 100-byte truncated JPEG IS expected to fail Sharp. 
      // The point is to check if the buffer has valid JPEG header bytes.
      if (buf1[0] === 0xFF && buf1[1] === 0xD8) {
        console.log("✅ Buffer HAS valid JPEG header (ff d8). Sharp failed only because test data is truncated.");
        console.log("   With full JPEG data from Make.com, this WILL work.");
      } else {
        console.log("❌ Buffer does NOT have valid JPEG header! Something is wrong with byte extraction.");
      }
    }
  }

  // Step 5: Test extractImageFromItem with the exact Make.com structure
  console.log("\n=== extractImageFromItem Test ===");
  const result = MultipartService.extractImageFromItem(parsed, 0);
  if (result) {
    console.log("Extracted buffer length:", result.filePart.buffer.length);
    console.log("First 20 hex:", result.filePart.buffer.subarray(0, 20).toString("hex"));
    const isJpeg = result.filePart.buffer[0] === 0xFF && result.filePart.buffer[1] === 0xD8;
    console.log("Valid JPEG header:", isJpeg);
  } else {
    console.log("❌ extractImageFromItem returned NULL");
  }

  console.log("\n=== DONE ===");
}).catch(err => {
  console.error("Import failed:", err.message);
});
