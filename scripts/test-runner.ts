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

  // Test 3: Status Normaliser (HSC1 & HSC4)
  const s1 = StatusNormaliserService.normalise("Completed", "HSC1");
  assert(s1.category === "completed" && s1.color === "green" && s1.isCompliant, "StatusNormaliser - HSC1 'Completed' is green/compliant");

  const s2 = StatusNormaliserService.normalise("Partially Completed", "HSC1");
  assert(s2.category === "in_progress" && s2.color === "yellow" && !s2.requiresAction, "StatusNormaliser - HSC1 'Partially Completed' is yellow/in progress");

  const s3 = StatusNormaliserService.normalise("Cannot Install", "HSC1");
  assert(s3.category === "cannot_install" && s3.color === "red" && s3.requiresAction, "StatusNormaliser - HSC1 'Cannot Install' is red/requires action");

  const s4 = StatusNormaliserService.normalise("No Power", "HSC1");
  assert(
    s4.category === "attention" && s4.color === "red" && s4.requiresAction && s4.badgeClass.includes("b-red"),
    "StatusNormaliser - HSC1 'No Power' is red/requires attention"
  );

  const s5_hsc4 = StatusNormaliserService.normalise("Good", "HSC4");
  assert(s5_hsc4.color === "green", "StatusNormaliser - HSC4 'Good' is green");

  const s6_hsc4 = StatusNormaliserService.normalise("Hole Cut to Big", "HSC4");
  assert(s6_hsc4.color === "red", "StatusNormaliser - HSC4 'Hole Cut to Big' is red");

  // HSC2 Tests
  const hsc2_g = StatusNormaliserService.normalise("Power On-site", "HSC2");
  assert(hsc2_g.color === "green", "StatusNormaliser - HSC2 'Power On-site' is green");
  const hsc2_r = StatusNormaliserService.normalise("No Power On-site", "HSC2");
  assert(hsc2_r.color === "red", "StatusNormaliser - HSC2 'No Power On-site' is red");
  const hsc2_y = StatusNormaliserService.normalise("In Progress Notes", "HSC2");
  assert(hsc2_y.color === "yellow", "StatusNormaliser - HSC2 other is yellow");

  // HSC3 Tests
  const hsc3_g = StatusNormaliserService.normalise("Hebel Cut Tight to Vent", "HSC3");
  assert(hsc3_g.color === "green", "StatusNormaliser - HSC3 'Hebel Cut Tight to Vent' is green");
  const hsc3_r = StatusNormaliserService.normalise("Bad", "HSC3");
  assert(hsc3_r.color === "red", "StatusNormaliser - HSC3 'Bad' is red");

  // RSC1 Tests
  const rsc1_g = StatusNormaliserService.normalise("Correct (<250mm)", "RSC1");
  assert(rsc1_g.color === "green", "StatusNormaliser - RSC1 'Correct (<250mm)' is green");
  const rsc1_r = StatusNormaliserService.normalise("Needs Adjusting (<100mm)", "RSC1");
  assert(rsc1_r.color === "red", "StatusNormaliser - RSC1 'Needs Adjusting (<100mm)' is red");

  // RSC2 Tests
  const rsc2_g = StatusNormaliserService.normalise("Good", "RSC2");
  assert(rsc2_g.color === "green", "StatusNormaliser - RSC2 'Good' is green");
  const rsc2_r = StatusNormaliserService.normalise("Stuck", "RSC2");
  assert(rsc2_r.color === "red", "StatusNormaliser - RSC2 'Stuck' is red");

  // RSC3 Tests
  const rsc3_g = StatusNormaliserService.normalise("Plus 150mm", "RSC3");
  assert(rsc3_g.color === "green", "StatusNormaliser - RSC3 'Plus 150mm' is green");
  const rsc3_r = StatusNormaliserService.normalise("Need Chipping Back", "RSC3");
  assert(rsc3_r.color === "red", "StatusNormaliser - RSC3 'Need Chipping Back' is red");

  // RSC4 Tests
  const rsc4_g = StatusNormaliserService.normalise("Done", "RSC4");
  assert(rsc4_g.color === "green", "StatusNormaliser - RSC4 'Done' is green");
  const rsc4_r = StatusNormaliserService.normalise("Stuck", "RSC4");
  assert(rsc4_r.color === "red", "StatusNormaliser - RSC4 'Stuck' is red");

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
      reportId: "HSC1-TEST-200",
      templateId: "lower-hebel-site-check-1",
      property: { fullAddress: "456 Sample Rd, Sydney" },
      responses: {
        powerInstalled: "No Power",
        sarkingInstalled: "Partially Completed",
        zeroBoundaryInstallation: "Cannot Install"
      }
    });
    const tpl = TemplateLoader.getTemplate("lower-hebel-site-check-1");
    const vm = ReportDataService.buildViewModel(meta, tpl, []);

    assert(vm.stats.completedCount === 0, "ReportDataService - Correct completed count (0 completed checks)");
    assert(vm.stats.inProgressCount === 33, "ReportDataService - Correct in-progress count (33 yellow/in-progress items)");
    assert(vm.stats.attentionCount === 2, "ReportDataService - Correct attention count (2 red items: No Power, Cannot Install)");
    assert(vm.stats.cannotInstallCount === 1, "ReportDataService - Correct cannot install count");
    assert(vm.outstandingItems.length === 2, "ReportDataService - Correct outstanding items count (2 red action items)");
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
