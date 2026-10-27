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
  const tempDir = path.join(process.cwd(), "temporary_reports");
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  const img1 = await createDummyImage("SITE INSPECTION PHOTO", "Quality Assurance Observation", "#1e3a8a");
  const uploadedFiles: UploadedFilePart[] = [
    { originalFileName: "site-photo-1.jpg", mimeType: "image/jpeg", buffer: img1, field: "images" }
  ];

  const reportConfigs: { id: string; title: string; type: string; responses: Record<string, string> }[] = [
    {
      id: "HSC2",
      title: "Pre Upper Hebel Install - Site Check 2",
      type: "Pre Upper Hebel Install",
      responses: {
        powerInstalled: "Power On-site", // Green
        waterInstalled: "No Water On-Site", // Red
        binEmpty: "Needs Emptying", // Red
        siteClean: "Not Required", // Green
        frameStraight: "Correct (<250mm)", // Green
        trussesFixed: "Complete", // Green
        wallWrapInstalled: "Completed", // Green
        battenSize: "Wrong for Batten Size", // Red
        safetyRailing: "Pending" // Yellow
      }
    },
    {
      id: "HSC3",
      title: "Post Upper Hebel Check - Site Check 3",
      type: "Post Upper Hebel Check",
      responses: {
        hebelInstalled: "Complete", // Green
        ventTightness: "Hebel Cut Tight to Vent", // Green
        penetrations: "Hole Cut to Big", // Red
        scaffoldRemoved: "Good", // Green
        caulkingComplete: "Bad", // Red
        rubbishCleared: "Yes", // Green
        framingSignedOff: "No", // Red
        guttersInspected: "In Progress" // Yellow
      }
    },
    {
      id: "RSC1",
      title: "Pre Upper Render Application - Site Check 1",
      type: "Pre Upper Render Application",
      responses: {
        hebelSubstrate: "Complete", // Green
        jointSpacing: "Correct (<250mm)", // Green
        windowProtection: "Not Complete", // Red
        expansionJoints: "Needs Adjusting (<100mm)", // Red
        baseCoatPrep: "Underway" // Yellow
      }
    },
    {
      id: "RSC2",
      title: "Post Upper Render Check - Site Check 2",
      type: "Post Upper Render Check",
      responses: {
        renderTexture: "Good", // Green
        renderCuring: "Complete", // Green
        windowSillsClean: "Yes", // Green
        scaffoldAccess: "Not Required", // Green
        renderBeading: "Stuck", // Red
        surfaceFinish: "Bad", // Red
        remedials: "Required", // Red
        touchUps: "In Progress" // Yellow
      }
    },
    {
      id: "RSC3",
      title: "Pre Lower Render Application - Site Check 3",
      type: "Pre Lower Render Application",
      responses: {
        slabRebateClearance: "Plus 150mm", // Green
        lowerSubstrate: "Correct", // Green
        dampProofCourse: "Complete", // Green
        maskingWindows: "Yes", // Green
        perimeterSlab: "Need Chipping Back", // Red
        groundClearance: "Less Than 100mm", // Red
        flashingInstalled: "No", // Red
        balconyTiling: "No Tiles Installed", // Red
        preppingJoints: "Pending" // Yellow
      }
    },
    {
      id: "RSC4",
      title: "Post Lower Render Check - Site Check 4",
      type: "Post Lower Render Check",
      responses: {
        lowerRenderFinish: "Complete", // Green
        drainageClear: "Good", // Green
        siteHandoverReady: "Done", // Green
        externalPainting: "Not Required", // Green
        expansionMould: "Stuck", // Red
        rectificationNotice: "Required", // Red
        cleanUpGarage: "In Progress" // Yellow
      }
    }
  ];

  for (const rep of reportConfigs) {
    console.log(`Generating ${rep.id} Sample Report...`);
    const metadata: InspectionMetadata = {
      reportId: `${rep.id}-9999-20261027`,
      templateId: rep.id,
      reportTitle: rep.title,
      reportType: rep.type,
      builder: "BOLD PROPERTIES",
      checkDate: "27/10/2026",
      siteChecksCompleted: `${rep.id} - Check Inspection`,
      property: {
        lotNumber: "101",
        addressLine: "200 Trade Way",
        suburb: "BRISBANE",
        fullAddress: `Lot 101, 200 Trade Way BRISBANE`
      },
      inspector: {
        name: "Jonathon Miller",
        company: "HWD Trade"
      },
      responses: rep.responses,
      generalNotes: [`Sample ${rep.id} inspection verification report.`],
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

    const tpl = TemplateLoader.getTemplate(rep.id);
    const result = await PdfCompressionService.generateOptimisedPdf(metadata, tpl, uploadedFiles);
    const savePath = path.join(tempDir, `${rep.id}_Inspection_Report.pdf`);
    fs.writeFileSync(savePath, result.pdfBuffer);
    console.log(`  -> Saved ${savePath} (${Math.round(result.pdfBuffer.length / 1024)} KB)`);
  }

  console.log("\nAll category sample PDFs generated successfully!");
}

run().catch(console.error);
