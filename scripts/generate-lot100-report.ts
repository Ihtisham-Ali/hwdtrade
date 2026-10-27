import fs from "fs";
import path from "path";
import sharp from "sharp";
import { chromium } from "playwright";
import { InspectionMetadata, UploadedFilePart } from "../src/schemas/inspection.schema.js";
import { TemplateLoader } from "../src/config/template-loader.js";
import { PdfCompressionService } from "../src/services/pdf-compression.service.js";
import { PdfRenderingService } from "../src/services/pdf-rendering.service.js";
import { ReportDataService } from "../src/services/report-data.service.js";

async function createDummyImage(text: string, color: string): Promise<Buffer> {
  const safeText = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const svg = `<svg width="1600" height="1200" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${color}"/>
      <rect x="50" y="50" width="1500" height="1100" fill="none" stroke="#FFFFFF" stroke-width="8"/>
      <text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" font-family="Arial, sans-serif" font-size="50" font-weight="bold" fill="#FFFFFF">${safeText}</text>
      <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-family="Arial, sans-serif" font-size="30" fill="#00AEEF">SITE INSPECTION EVIDENCE PHOTO</text>
    </svg>`;
  return await sharp(Buffer.from(svg)).jpeg({ quality: 85 }).toBuffer();
}

async function main() {
  console.log("🚀 Generating updated PDF for Lot 100 with 'No Power' attention update...");

  const img1 = await createDummyImage("PHOTO 01: FRONT ELEVATION & ELECTRICAL BOX", "#0F172A");
  const img2 = await createDummyImage("PHOTO 02: UTILITIES & SERVICES CHECK", "#1E293B");

  const uploadedFiles: UploadedFilePart[] = [
    { originalFileName: "inspection-photo-01.jpg", mimeType: "image/jpeg", buffer: img1, field: "images" },
    { originalFileName: "inspection-photo-02.jpg", mimeType: "image/jpeg", buffer: img2, field: "images" },
  ];

  const metadata: InspectionMetadata = {
    reportId: "HSC1-LOT100-20261022",
    templateId: "lower-hebel-site-check-1",
    reportTitle: "Site Check 1 Inspection",
    reportType: "Lower Hebel Installation",
    builder: "BOLD",
    checkDate: "22/10/2026",
    siteChecksCompleted: "HSC1 - Check 1",
    property: {
      lotNumber: "100",
      addressLine: "162 Current Street",
      fullAddress: "Lot 100, 162 Current Street"
    },
    inspector: {
      name: "Site Supervisor",
      company: "HWD Trade"
    },
    branding: {
      companyName: "HWD Trade",
      primaryColour: "#0F172A",
      accentColour: "#00AEEF",
      secondaryColour: "#14B8A6"
    },
    responses: {
      powerInstalled: "No Power",
      powerMarked: "Not Completed",
      waterInstalled: "Water Onsite",
      binEmptyingRequired: "Not Required",
      siteCleanRequired: "Not Required",
      doubleSkinWires: "Completed",
      wireHeight: "Completed",
      airConditioningPipe: "Set Inside Stud Cavity",
      gasPipes: "Completed",
      waterPipes: "Completed",
      sarkingInstalled: "Completed",
      windowsInstalled: "Completed",
      windowReveals: "Correct",
      doorsInstalled: "Completed",
      doorJambReveals: "Correct",
      slidersInstalled: "Completed",
      garageDoorJamb: "Completed",
      garageDoorJambWidth: "Correct",
      garageHead: "Correct",
      garageHeadNotes: "",
      frameToFacia: "Correct For Frame",
      edgeProtectionRemoved: "Completed",
      scaffoldRemoval: "Not Required",
      zeroBoundaryInstallation: "Completed",
      zeroBoundaryNotes: "",
      frameCheck: "Correct",
      pierFraming: "0x Pier Frame",
      additionalFraming: "Not Required",
      framingNotes: "",
      slabRebate: "Correct",
      soilHeight: "Correct",
      soilHeightNotes: "",
      termiteBarrierPierSlab: "0x Pier to Slab",
      termiteBarrierPierFooting: "0x Pier to Footing",
      termiteBarrierOrdered: "Not Required"
    },
    generalNotes: [
      "- All window's except one is installed - No powerbox/power onsite"
    ],
    imageMetadata: [
      { fileName: "inspection-photo-01.jpg", caption: "Front elevation & electrical box inspection", section: "General Site", sequence: 1 },
      { fileName: "inspection-photo-02.jpg", caption: "Utilities & services overview", section: "Utilities & Services", sequence: 2 }
    ],
    options: {
      includeCoverPage: true,
      includeSummary: true,
      includeOutstandingItems: true,
      includePhotographs: true,
      includeImageCaptions: true,
      includePageNumbers: true,
      maximumPdfSizeMb: 20
    }
  };

  const template = TemplateLoader.getTemplate(metadata.templateId);

  // Generate PDF
  const result = await PdfCompressionService.generateOptimisedPdf(
    metadata,
    template,
    uploadedFiles
  );

  const localReportPath = path.join(process.cwd(), "temporary_reports", "HSC1_Lot100_Inspection_Report.pdf");
  fs.writeFileSync(localReportPath, result.pdfBuffer);

  const artifactDir = "/Users/ihtishamali/.gemini/antigravity-ide/brain/9adc3e2f-c963-4cc0-9b17-7c9d85df384d";
  const artifactPdfPath = path.join(artifactDir, "HSC1_Lot100_Inspection_Report.pdf");
  fs.writeFileSync(artifactPdfPath, result.pdfBuffer);

  console.log(`✅ PDF Generated: ${localReportPath}`);
  console.log(`✅ PDF Copied to Artifact: ${artifactPdfPath}`);

  // Generate page screenshots for preview
  const viewModel = ReportDataService.buildViewModel(metadata, template, result.processedImages);
  console.log("Stats Summary:", JSON.stringify(viewModel.stats, null, 2));

  const html = await PdfRenderingService.renderHtml(viewModel);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 850, height: 1200 } });
  await page.setContent(html, { waitUntil: "load" });

  const pageElements = await page.$$(".page");
  console.log(`Rendered ${pageElements.length} pages.`);

  for (let i = 0; i < pageElements.length; i++) {
    const pageImgPath = path.join(artifactDir, `page_${i + 1}.png`);
    await pageElements[i].screenshot({ path: pageImgPath });
    console.log(`Saved screenshot page ${i + 1}: ${pageImgPath}`);
  }

  await browser.close();
  await PdfRenderingService.closeBrowser();
  console.log("🎉 Complete!");
}

main().catch((err) => {
  console.error("Error generating Lot 100 PDF:", err);
  process.exit(1);
});
