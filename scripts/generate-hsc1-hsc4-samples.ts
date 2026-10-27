import fs from "fs";
import path from "path";
import sharp from "sharp";
import { InspectionMetadata, UploadedFilePart } from "../src/schemas/inspection.schema.js";
import { TemplateLoader } from "../src/config/template-loader.js";
import { PdfCompressionService } from "../src/services/pdf-compression.service.js";

async function createDummyImage(title: string, subtitle: string, color: string): Promise<Buffer> {
  const safeTitle = title.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const safeSub = subtitle.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const svg = `<svg width="1600" height="1200" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${color};stop-opacity:1" />
          <stop offset="100%" style="stop-color:#0b0f19;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#grad)"/>
      <rect x="50" y="50" width="1500" height="1100" fill="none" stroke="#FFFFFF" stroke-width="4" stroke-opacity="0.3"/>
      <text x="50%" y="46%" dominant-baseline="middle" text-anchor="middle" font-family="'Helvetica Neue', Arial, sans-serif" font-size="48" font-weight="bold" fill="#FFFFFF">${safeTitle}</text>
      <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="'Helvetica Neue', Arial, sans-serif" font-size="28" font-weight="600" fill="#00AEEF">${safeSub}</text>
    </svg>`;
  return await sharp(Buffer.from(svg)).jpeg({ quality: 85 }).toBuffer();
}

async function run() {
  const artifactDir = "/Users/ihtishamali/.gemini/antigravity-ide/brain/fe0c7487-91ec-4ce6-b5a7-8a45e22dd408";
  const tempDir = path.join(process.cwd(), "temporary_reports");
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  console.log("Generating dummy images...");
  const img1 = await createDummyImage("ELEVATION & SITE ACCESS", "HSC1 Pre-Installation Inspection", "#1e3a8a");
  const img2 = await createDummyImage("UTILITIES & SLAB REBATE", "Site Check Quality Assurance", "#065f46");

  const uploadedFiles: UploadedFilePart[] = [
    { originalFileName: "site-photo-1.jpg", mimeType: "image/jpeg", buffer: img1, field: "images" },
    { originalFileName: "site-photo-2.jpg", mimeType: "image/jpeg", buffer: img2, field: "images" },
  ];

  // ==========================================
  // 1. GENERATE HSC1 REPORT
  // ==========================================
  console.log("📄 Generating HSC1 Sample Report...");
  const hsc1Metadata: InspectionMetadata = {
    reportId: "HSC1-4106-20261026",
    templateId: "HSC1",
    reportTitle: "Lower Hebel Site Check 1",
    reportType: "Lower Hebel Installation",
    builder: "BOLD PROPERTIES",
    checkDate: "26/10/2026",
    siteChecksCompleted: "HSC1 - Check 1",
    property: {
      lotNumber: "026",
      addressLine: "162 Cumner Road",
      suburb: "WHITE ROCK",
      fullAddress: "Lot 026, 162 Cumner Road WHITE ROCK"
    },
    inspector: {
      name: "Jonathon Miller",
      company: "HWD Trade"
    },
    supervisor: {
      name: "Jonathon Miller",
      company: "HWD Trade"
    },
    branding: {
      companyName: "HWD Trade",
      primaryColour: "#0F172A",
      accentColour: "#00AEEF",
      secondaryColour: "#14B8A6"
    },
    responses: {
      // GREEN items for HSC1
      siteReadyForHsc1: "Site Ready for HSC1",
      powerInstalled: "No Power", // RED
      powerMarked: "Site Ready for HSC1",
      waterInstalled: "Water Onsite", // GREEN
      binEmptyingRequired: "Needs Emptying", // RED
      siteCleanRequired: "Site Clean Required", // RED
      doubleSkinWires: "Completed", // GREEN
      wireHeight: "Completed", // GREEN
      airConditioningPipe: "Set Inside Stud Cavity", // GREEN
      gasPipes: "Completed", // GREEN
      waterPipes: "Completed", // GREEN
      sarkingInstalled: "Completed", // GREEN
      windowsInstalled: "Yes", // GREEN
      windowReveals: "Correct", // GREEN
      doorsInstalled: "Yes", // GREEN
      doorJambReveals: "Correct", // GREEN
      slidersInstalled: "Yes", // GREEN
      garageDoorJamb: "Ordered by HWD", // GREEN
      garageDoorJambWidth: "Correct", // GREEN
      garageHead: "Correct For Frame Type", // GREEN
      frameToFacia: "Correct For Frame Type", // GREEN
      edgeProtectionRemoved: "Completed", // GREEN
      scaffoldRemoval: "Not Required", // GREEN
      zeroBoundaryInstallation: "Cannot Install", // RED
      frameCheck: "Full Frame Check Required", // RED
      pierFraming: "In Progress", // YELLOW
      additionalFraming: "Not Required", // GREEN
      slabRebate: "Correct", // GREEN
      soilHeight: "***Needs Adjusting***", // RED
      termiteBarrierPierSlab: "Partially Installed", // YELLOW
      termiteBarrierPierFooting: "In Progress", // YELLOW
      termiteBarrierOrdered: "Ordered by HWD" // GREEN
    },
    generalNotes: [
      "- Utilities check identified no active power to site meter box.",
      "- Zero boundary obstruction noted at northern boundary line; investigation required.",
      "- All window and sliding door installations conform to specification."
    ],
    imageMetadata: [
      { fileName: "site-photo-1.jpg", caption: "Front Elevation and Power Meter Box Check", section: "Utilities & Services", sequence: 1 },
      { fileName: "site-photo-2.jpg", caption: "Slab Rebate and Perimeter Inspection", section: "Slab & Footings", sequence: 2 }
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

  const hsc1Template = TemplateLoader.getTemplate("HSC1");
  const hsc1Result = await PdfCompressionService.generateOptimisedPdf(hsc1Metadata, hsc1Template, uploadedFiles);

  const hsc1LocalPath = path.join(tempDir, "HSC1_Inspection_Report.pdf");
  const hsc1ArtifactPath = path.join(artifactDir, "HSC1_Inspection_Report.pdf");
  fs.writeFileSync(hsc1LocalPath, hsc1Result.pdfBuffer);
  fs.writeFileSync(hsc1ArtifactPath, hsc1Result.pdfBuffer);
  console.log(`✅ HSC1 Report generated: ${hsc1LocalPath} (${Math.round(hsc1Result.pdfBuffer.length / 1024)} KB)`);

  // ==========================================
  // 2. GENERATE HSC4 REPORT
  // ==========================================
  console.log("📄 Generating HSC4 Sample Report...");
  const hsc4Metadata: InspectionMetadata = {
    reportId: "HSC4-8821-20261026",
    templateId: "HSC4",
    reportTitle: "Post Lower Hebel Check 4",
    reportType: "Post Lower Hebel Check",
    builder: "METRICON HOMES",
    checkDate: "26/10/2026",
    siteChecksCompleted: "HSC4 - Check 4",
    property: {
      lotNumber: "142",
      addressLine: "88 Horizon Boulevard",
      suburb: "SPRING MOUNTAIN",
      fullAddress: "Lot 142, 88 Horizon Boulevard SPRING MOUNTAIN"
    },
    inspector: {
      name: "Jonathon Miller",
      company: "HWD Trade"
    },
    supervisor: {
      name: "Jonathon Miller",
      company: "HWD Trade"
    },
    branding: {
      companyName: "HWD Trade",
      primaryColour: "#0F172A",
      accentColour: "#00AEEF",
      secondaryColour: "#14B8A6"
    },
    responses: {
      // HSC4 Green: Completed, Complete, Good, Not Required
      // HSC4 Red: Not Completed, Hole Cut to Big, Not Complete, Bad, Required
      // Yellow: Everything else
      hebelComplete: "Completed", // GREEN
      doorSillsInstalled: "Complete", // GREEN
      doorSillsHeadsStraight: "Good", // GREEN
      windowSillsHeadsStraight: "Good", // GREEN
      hebelBlocks: "Not Completed", // RED
      sliderDoorSillsInstalled: "Complete", // GREEN
      cornersStraightRasped: "Good", // GREEN
      cjSpacing: "Good", // GREEN
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
    generalNotes: [
      "- Post Lower Hebel inspection conducted.",
      "- Sealing around power box requires rasping and patch rectification due to oversized cutout.",
      "- Site cleaning and garage tidy underway prior to final sign-off."
    ],
    imageMetadata: [
      { fileName: "site-photo-1.jpg", caption: "Hebel Panel Alignment and Finish Check", section: "Hebel Installation", sequence: 1 },
      { fileName: "site-photo-2.jpg", caption: "Power Box Penetration Observation", section: "Sealing & Patching", sequence: 2 }
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

  const hsc4Template = TemplateLoader.getTemplate("HSC4");
  const hsc4Result = await PdfCompressionService.generateOptimisedPdf(hsc4Metadata, hsc4Template, uploadedFiles);

  const hsc4LocalPath = path.join(tempDir, "HSC4_Inspection_Report.pdf");
  const hsc4ArtifactPath = path.join(artifactDir, "HSC4_Inspection_Report.pdf");
  fs.writeFileSync(hsc4LocalPath, hsc4Result.pdfBuffer);
  fs.writeFileSync(hsc4ArtifactPath, hsc4Result.pdfBuffer);
  console.log(`✅ HSC4 Report generated: ${hsc4LocalPath} (${Math.round(hsc4Result.pdfBuffer.length / 1024)} KB)`);

  console.log("\n🎉 Both HSC1 and HSC4 reports successfully generated!");
}

run().catch((err) => {
  console.error("Error generating reports:", err);
  process.exit(1);
});
