import fs from "fs";
import path from "path";
import { chromium } from "playwright";
import { PdfRenderingService } from "../src/services/pdf-rendering.service.js";
import { ReportDataService } from "../src/services/report-data.service.js";
import { TemplateLoader } from "../src/config/template-loader.js";
import { InspectionMetadata } from "../src/schemas/inspection.schema.js";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1000, height: 1400 } });
  const page = await context.newPage();

  const artifactDir = "/Users/ihtishamali/.gemini/antigravity-ide/brain/fe0c7487-91ec-4ce6-b5a7-8a45e22dd408";

  // ==========================================
  // HSC1 PREVIEW
  // ==========================================
  const hsc1Metadata: InspectionMetadata = {
    reportId: "HSC1-4106-20261026",
    templateId: "HSC1",
    reportTitle: "Lower Hebel Site Check 1",
    reportType: "Lower Hebel Installation",
    builder: "BOLD PROPERTIES",
    checkDate: "26/10/2026",
    siteChecksCompleted: "HSC1 - Check 1",
    property: { fullAddress: "Lot 026, 162 Cumner Road WHITE ROCK" },
    responses: {
      siteReadyForHsc1: "Site Ready for HSC1", // GREEN
      powerInstalled: "No Power", // RED
      waterInstalled: "Water Onsite", // GREEN
      binEmptyingRequired: "Needs Emptying", // RED
      siteCleanRequired: "Site Clean Required", // RED
      doubleSkinWires: "Completed", // GREEN
      airConditioningPipe: "Set Inside Stud Cavity", // GREEN
      sarkingInstalled: "Completed", // GREEN
      windowsInstalled: "Yes", // GREEN
      doorsInstalled: "Yes", // GREEN
      zeroBoundaryInstallation: "Cannot Install", // RED
      pierFraming: "In Progress", // YELLOW
      termiteBarrierPierSlab: "Partially Installed", // YELLOW
      termiteBarrierOrdered: "Ordered by HWD" // GREEN
    },
    generalNotes: ["- Active inspection notes recorded."],
    options: {
      includeCoverPage: true,
      includeSummary: true,
      includeOutstandingItems: true,
      includePhotographs: false,
      includeImageCaptions: true,
      includePageNumbers: true,
      maximumPdfSizeMb: 20
    }
  };

  const hsc1Tpl = TemplateLoader.getTemplate("HSC1");
  const hsc1Vm = ReportDataService.buildViewModel(hsc1Metadata, hsc1Tpl, []);
  const hsc1Html = await PdfRenderingService.renderHtml(hsc1Vm);

  await page.setContent(hsc1Html, { waitUntil: "load" });
  const pages = await page.$$(".page");

  if (pages.length >= 2) {
    // Page 2 is the Summary & Dashboard
    await pages[1].screenshot({ path: path.join(artifactDir, "hsc1_dashboard_preview.png") });
    console.log("Saved hsc1_dashboard_preview.png");
  }
  if (pages.length >= 3) {
    // Page 3 is Details
    await pages[2].screenshot({ path: path.join(artifactDir, "hsc1_details_preview.png") });
    console.log("Saved hsc1_details_preview.png");
  }

  // ==========================================
  // HSC4 PREVIEW
  // ==========================================
  const hsc4Metadata: InspectionMetadata = {
    reportId: "HSC4-8821-20261026",
    templateId: "HSC4",
    reportTitle: "Post Lower Hebel Check 4",
    reportType: "Post Lower Hebel Check",
    builder: "METRICON HOMES",
    checkDate: "26/10/2026",
    siteChecksCompleted: "HSC4 - Check 4",
    property: { fullAddress: "Lot 142, 88 Horizon Boulevard SPRING MOUNTAIN" },
    responses: {
      hebelComplete: "Completed", // GREEN
      doorSillsInstalled: "Complete", // GREEN
      doorSillsHeadsStraight: "Good", // GREEN
      windowSillsHeadsStraight: "Good", // GREEN
      hebelBlocks: "Not Completed", // RED
      sliderDoorSillsInstalled: "Complete", // GREEN
      cjSealing: "In Progress", // YELLOW
      windowSealing: "Complete", // GREEN
      patching: "In Progress", // YELLOW
      sealingPowerBox: "Hole Cut to Big", // RED
      airVentsCutTight: "Good", // GREEN
      expandingFoamHoles: "Required", // RED
      expandingFoamSoffit: "Not Required", // GREEN
      blackPaint: "Bad", // RED
      cleaningSlabs: "Completed", // GREEN
      cleaningSite: "Not Complete", // RED
      cleaningGarage: "In Progress", // YELLOW
      jobQuality: "Good", // GREEN
      returnToSite: "Required" // RED
    },
    generalNotes: ["- Post Lower Hebel inspection notes recorded."],
    options: {
      includeCoverPage: true,
      includeSummary: true,
      includeOutstandingItems: true,
      includePhotographs: false,
      includeImageCaptions: true,
      includePageNumbers: true,
      maximumPdfSizeMb: 20
    }
  };

  const hsc4Tpl = TemplateLoader.getTemplate("HSC4");
  const hsc4Vm = ReportDataService.buildViewModel(hsc4Metadata, hsc4Tpl, []);
  const hsc4Html = await PdfRenderingService.renderHtml(hsc4Vm);

  await page.setContent(hsc4Html, { waitUntil: "load" });
  const pages4 = await page.$$(".page");

  if (pages4.length >= 2) {
    await pages4[1].screenshot({ path: path.join(artifactDir, "hsc4_dashboard_preview.png") });
    console.log("Saved hsc4_dashboard_preview.png");
  }
  if (pages4.length >= 3) {
    await pages4[2].screenshot({ path: path.join(artifactDir, "hsc4_details_preview.png") });
    console.log("Saved hsc4_details_preview.png");
  }

  await browser.close();
}

run().catch(console.error);
