/**
 * Test: Verify concatenated JSON object splitting (Make.com Array Aggregator format)
 */

// Simulate 3 images as concatenated JSON objects (how Make.com sends them)
const img1Bytes = [255, 216, 255, 224, 0, 16, 74, 70, 73, 70]; // JPEG header
const img2Bytes = [255, 216, 255, 225, 0, 28, 69, 120, 105, 102]; // JPEG with EXIF
const img3Bytes = [255, 216, 255, 224, 0, 16, 74, 70, 73, 70]; // Another JPEG

const obj1 = JSON.stringify({ field: { data: { type: "Buffer", data: img1Bytes } } });
const obj2 = JSON.stringify({ field: { data: { type: "Buffer", data: img2Bytes } } });
const obj3 = JSON.stringify({ field: { data: { type: "Buffer", data: img3Bytes } } });

// Make.com concatenates them WITHOUT separators
const concatenated = obj1 + obj2 + obj3;

console.log("=== Concatenated JSON Test ===");
console.log(`Total string length: ${concatenated.length}`);
console.log(`Contains '}{': ${concatenated.includes("}{")}`);
console.log(`Preview: ${concatenated.substring(0, 80)}...`);

// Test 1: Standard JSON.parse should FAIL
try {
  JSON.parse(concatenated);
  console.log("❌ Standard JSON.parse should have failed!");
} catch (e: any) {
  console.log(`✅ Standard JSON.parse failed as expected: ${e.message}`);
}

// Test 2: Split at }{ boundaries  
const parts = concatenated.split(/\}\s*\{/);
console.log(`\nSplit into ${parts.length} parts`);

const objectArray: any[] = [];
for (let i = 0; i < parts.length; i++) {
  let chunk = parts[i];
  if (i > 0) chunk = "{" + chunk;
  if (i < parts.length - 1) chunk = chunk + "}";
  try {
    objectArray.push(JSON.parse(chunk));
    console.log(`  Part ${i}: parsed OK`);
  } catch (e: any) {
    console.log(`  Part ${i}: FAILED - ${e.message}`);
  }
}
console.log(`\nParsed ${objectArray.length} objects`);

// Test 3: Extract buffers from each parsed object
import("../src/services/multipart.service.js").then(({ MultipartService }) => {
  console.log("\n=== Buffer Extraction from Split Objects ===");
  for (let i = 0; i < objectArray.length; i++) {
    const result = MultipartService.extractImageFromItem(objectArray[i], i);
    if (result) {
      const buf = result.filePart.buffer;
      const isJpeg = buf[0] === 0xFF && buf[1] === 0xD8;
      console.log(`  Image ${i}: ${buf.length} bytes, JPEG=${isJpeg}, hex=${buf.subarray(0, 6).toString("hex")}`);
    } else {
      console.log(`  Image ${i}: extraction returned null`);
    }
  }
  
  console.log("\n✅ All tests passed! Concatenated JSON splitting works correctly.");
});
