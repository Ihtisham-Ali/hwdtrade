import fs from "fs";
import path from "path";
import sharp from "sharp";
import { InspectionMetadata } from "../src/schemas/inspection.schema.js";
import { TemplateLoader } from "../src/config/template-loader.js";
import { PdfCompressionService } from "../src/services/pdf-compression.service.js";
import { PdfRenderingService } from "../src/services/pdf-rendering.service.js";
import { UploadedFilePart } from "../src/schemas/inspection.schema.js";

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
  console.log("🛠️ Generating test inspection images & compiling sample PDF...");

  // Create 3 realistic sample images
  const img1 = await createDummyImage("PHOTO 01: FRONT ELEVATION OVERVIEW", "#0F172A");
  const img2 = await createDummyImage("PHOTO 02: ZERO BOUNDARY WALL AREA", "#1E293B");
  const img3 = await createDummyImage("PHOTO 03: SARKING & WINDOW REVEAL CHECK", "#334155");

  const uploadedFiles: UploadedFilePart[] = [
    { originalFileName: "inspection-photo-01.jpg", mimeType: "image/jpeg", buffer: img1, field: "images" },
    { originalFileName: "inspection-photo-02.jpg", mimeType: "image/jpeg", buffer: img2, field: "images" },
    { originalFileName: "inspection-photo-03.jpg", mimeType: "image/jpeg", buffer: img3, field: "images" },
  ];

  // Sample metadata matching prompt exact spec
  const sampleMetadata: InspectionMetadata = {
    reportId: "HSC1-4106-20260402",
    templateId: "lower-hebel-site-check-1",
    reportTitle: "Site Check 1 Inspection",
    reportType: "Lower Hebel Installation",
    builder: "BOLD",
    checkDate: "02/04/2026",
    siteChecksCompleted: "HSC1 - Check 1",
    property: {
      lotNumber: "4106",
      addressLine: "Heathcote Circuit",
      suburb: "REDLAND BAY",
      postcode: "4165",
      fullAddress: "Lot 4106 Heathcote Circuit, REDLAND BAY 4165"
    },
    inspector: {
      name: "Supervisor Name",
      company: "HWD Trade"
    },
    branding: {
      companyName: "HWD Trade",
      primaryColour: "#0F172A",
      accentColour: "#00AEEF",
      secondaryColour: "#14B8A6"
    },
    responses: {
      powerInstalled: "Completed",
      powerMarked: "Conduit Visible",
      waterInstalled: "Water Onsite",
      binEmptyingRequired: "Not Required",
      siteCleanRequired: "Not Required",
      doubleSkinWires: "Completed",
      wireHeight: "Completed",
      airConditioningPipe: "Set Inside Stud Cavity",
      gasPipes: "Completed",
      waterPipes: "Completed",
      sarkingInstalled: "Partially Completed",
      windowsInstalled: "Completed",
      windowReveals: "Correct",
      doorsInstalled: "Completed",
      doorJambReveals: "Correct",
      slidersInstalled: "Completed",
      garageDoorJamb: "Completed",
      garageDoorJambWidth: "Correct",
      garageHead: "Correct",
      garageHeadNotes: "",
      frameToFacia: "Correct",
      edgeProtectionRemoved: "Completed",
      scaffoldRemoval: "Not Required",
      zeroBoundaryInstallation: "Cannot Install",
      zeroBoundaryNotes: "Temporary platform needed as boundary wall is over 1.2m lower.",
      frameCheck: "Correct",
      pierFraming: "0x Pier Frame",
      additionalFraming: "Not Required",
      framingNotes: "",
      slabRebate: "Correct",
      soilHeight: "Less Than 100mm",
      soilHeightNotes: "",
      termiteBarrierPierSlab: "0x Pier to Slab",
      termiteBarrierPierFooting: "1x Pier to Footing",
      termiteBarrierOrdered: "Ordered by HWD"
    },
    generalNotes: [
      "Temporary platform needed as boundary wall is over 1.2m lower.",
      "Fix sarking before the next inspection."
    ],
    imageMetadata: [
      { fileName: "inspection-photo-01.jpg", caption: "Front elevation overview", section: "General Site", sequence: 1 },
      { fileName: "inspection-photo-02.jpg", caption: "Zero boundary area requiring temporary platform", section: "Edge Protection, Scaffold and Zero Boundary", sequence: 2 },
      { fileName: "inspection-photo-03.jpg", caption: "Sarking check requiring touch-ups", section: "Wall Wrap, Sarking, Windows, Doors & Fascia", sequence: 3 }
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

  const template = TemplateLoader.getTemplate(sampleMetadata.templateId);

  const result = await PdfCompressionService.generateOptimisedPdf(
    sampleMetadata,
    template,
    uploadedFiles
  );

  const outputPath = path.join(process.cwd(), "sample_output_inspection_report.pdf");
  fs.writeFileSync(outputPath, result.pdfBuffer);

  console.log(`\n✅ PDF Inspection Report Successfully Generated!`);
  console.log(`📍 File Saved To:    ${outputPath}`);
  console.log(`📦 PDF File Size:    ${result.pdfSizeMb} MB (${result.pdfSizeBytes} bytes)`);
  console.log(`⚙️ Compression Pass: ${result.compressionProfile}`);
  console.log(`📸 Images Processed: ${result.processedImages.length}`);
  console.log(`⚠️ Warnings:         ${result.warnings.length === 0 ? "None" : JSON.stringify(result.warnings)}`);

  await PdfRenderingService.closeBrowser();
}

main().catch((err) => {
  console.error("❌ Error generating sample PDF:", err);
  process.exit(1);
});
