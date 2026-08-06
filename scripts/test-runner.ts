import fs from "fs";
import path from "path";
import sharp from "sharp";
import { InspectionMetadataSchema, UploadedFilePart } from "../src/schemas/inspection.schema.js";
import { TemplateLoader } from "../src/config/template-loader.js";
import { StatusNormaliserService } from "../src/services/status-normaliser.service.js";
import { ImageProcessingService } from "../src/services/image-processing.service.js";
import { ReportDataService } from "../src/services/report-data.service.js";
import { PdfRenderingService } from "../src/services/pdf-rendering.service.js";

async function runTests() {
  console.log("🧪 Starting Automated Test Suite for Site Inspection PDF Generator...\n");
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  // Test 1: Zod Metadata Validation
  try {
    const validMeta = InspectionMetadataSchema.parse({
      reportId: "TEST-100",
      templateId: "lower-hebel-site-check-1",
      property: { fullAddress: "123 Test Street, Brisbane 4000" }
    });
    assert(validMeta.reportId === "TEST-100", "Zod Metadata Validation - Valid Input");
  } catch (e: any) {
    assert(false, `Zod Metadata Validation - ${e.message}`);
  }

  // Test 2: Template Loader
  try {
    const tpl = TemplateLoader.getTemplate("lower-hebel-site-check-1");
    assert(tpl.sections.length === 8, "TemplateLoader - Loads lower-hebel-site-check-1 sections");
  } catch (e: any) {
    assert(false, `TemplateLoader - ${e.message}`);
  }

  // Test 3: Status Normaliser
  const s1 = StatusNormaliserService.normalise("Completed");
  assert(s1.category === "completed" && s1.isCompliant, "StatusNormaliser - 'Completed' is compliant");

  const s2 = StatusNormaliserService.normalise("Partially Completed");
  assert(s2.category === "attention" && s2.requiresAction, "StatusNormaliser - 'Partially Completed' requires action");

  const s3 = StatusNormaliserService.normalise("Cannot Install");
  assert(s3.category === "cannot_install" && s3.requiresAction, "StatusNormaliser - 'Cannot Install' requires action");

  // Test 4: Sharp Image Processing
  try {
    const svg = `<svg width="800" height="600"><rect width="100%" height="100%" fill="#0F172A"/></svg>`;
    const dummyBuffer = await sharp(Buffer.from(svg)).jpeg().toBuffer();
    const filePart: UploadedFilePart = { originalFileName: "test.jpg", mimeType: "image/jpeg", buffer: dummyBuffer, field: "images" };
    
    const processed = await ImageProcessingService.processSingleImage(filePart, 1, "high");
    assert(processed.width === 800 && processed.base64DataUri.startsWith("data:image/jpeg;base64,"), "Sharp Image Processing - Returns Base64 JPEG");
  } catch (e: any) {
    assert(false, `Sharp Image Processing - ${e.message}`);
  }

  // Test 5: Report Data ViewModel Assembly & Stats Aggregation
  try {
    const meta = InspectionMetadataSchema.parse({
      reportId: "TEST-200",
      templateId: "lower-hebel-site-check-1",
      property: { fullAddress: "456 Sample Rd, Sydney" },
      responses: {
        powerInstalled: "Completed",
        sarkingInstalled: "Partially Completed",
        zeroBoundaryInstallation: "Cannot Install"
      }
    });
    const tpl = TemplateLoader.getTemplate("lower-hebel-site-check-1");
    const vm = ReportDataService.buildViewModel(meta, tpl, []);

    assert(vm.stats.completedCount === 1, "ReportDataService - Correct completed count");
    assert(vm.stats.attentionCount === 1, "ReportDataService - Correct attention count");
    assert(vm.stats.cannotInstallCount === 1, "ReportDataService - Correct cannot install count");
    assert(vm.outstandingItems.length === 2, "ReportDataService - Correct outstanding items count (2 action items)");
  } catch (e: any) {
    assert(false, `ReportDataService - ${e.message}`);
  }

  // Test 6: PDF Rendering Engine (Playwright)
  try {
    const meta = InspectionMetadataSchema.parse({
      reportId: "TEST-300",
      templateId: "lower-hebel-site-check-1",
      property: { fullAddress: "789 Ocean Drive, Gold Coast" }
    });
    const tpl = TemplateLoader.getTemplate("lower-hebel-site-check-1");
    const vm = ReportDataService.buildViewModel(meta, tpl, []);
    const pdfBuf = await PdfRenderingService.generatePdfBuffer(vm);
    
    assert(pdfBuf.length > 50000 && pdfBuf.slice(0, 5).toString() === "%PDF-", "PdfRenderingService - Valid PDF Buffer Generated");
  } catch (e: any) {
    assert(false, `PdfRenderingService - ${e.message}`);
  } finally {
    await PdfRenderingService.closeBrowser();
  }

  console.log(`\n======================================================`);
  console.log(`RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log(`======================================================\n`);

  if (failed > 0) process.exit(1);
}

runTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
