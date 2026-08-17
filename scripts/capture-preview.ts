import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { ReportDataService } from "../src/services/report-data.service.js";
import { PdfRenderingService } from "../src/services/pdf-rendering.service.js";
import { TemplateLoader } from "../src/config/template-loader.js";

async function createDummyImage(text: string, color: string): Promise<string> {
  const safeText = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const svg = `<svg width="1200" height="900" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${color}"/>
      <rect x="40" y="40" width="1120" height="820" fill="none" stroke="#FFFFFF" stroke-width="6"/>
      <text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" font-family="Arial, sans-serif" font-size="44" font-weight="bold" fill="#FFFFFF">${safeText}</text>
      <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" fill="#00AEEF">SITE PHOTOGRAPHY EVIDENCE</text>
    </svg>`;
  const buf = await sharp(Buffer.from(svg)).jpeg({ quality: 80 }).toBuffer();
  return `data:image/jpeg;base64,${buf.toString("base64")}`;
}

async function capturePreviews() {
  const template = TemplateLoader.getTemplate("lower-hebel-site-check-1");

  const logoBuf = fs.readFileSync(path.join(process.cwd(), "public", "logo.png"));
  const logoUri = `data:image/png;base64,${logoBuf.toString("base64")}`;

  const img1Uri = await createDummyImage("PHOTO 1: FRONT ELEVATION OVERVIEW", "#111827");
  const img2Uri = await createDummyImage("PHOTO 2: ZERO BOUNDARY WALL AREA", "#1F2937");

  const processedImages = [
    {
      id: "img_1",
      originalFileName: "photo1.jpg",
      mimeType: "image/jpeg",
      width: 1200,
      height: 900,
      isPortrait: false,
      base64DataUri: img1Uri,
      sizeBytes: 50000,
      sequence: 1,
    },
    {
      id: "img_2",
      originalFileName: "photo2.jpg",
      mimeType: "image/jpeg",
      width: 1200,
      height: 900,
      isPortrait: false,
      base64DataUri: img2Uri,
      sizeBytes: 50000,
      sequence: 2,
    },
  ];

  const sampleMetadata: any = {
    reportId: "HSC1-12738265932",
    templateId: "lower-hebel-site-check-1",
    reportTitle: "Test Ali",
    reportType: "Lower Hebel Installation",
    builder: "N/A",
    checkDate: "07/08/2026",
    siteChecksCompleted: "HSC1 - Check 1",
    property: {
      addressLine: "Test Ali",
      fullAddress: "Test Ali",
    },
    inspector: {
      name: "Site Inspector",
      company: "HWD Trade",
    },
    branding: {
      companyName: "HWD Trade",
      logoUrl: logoUri,
    },
    responses: {
      powerInstalled: "Power Onsite but Box Not Installed to House",
      powerMarked: "Conduct Visible",
      waterInstalled: "Water Onsite",
      binEmptyingRequired: "Half Full",
      siteCleanRequired: "Not Required",
      doubleSkinWires: "Not Completed",
      wireHeight: "Completed",
      airConditioningPipe: "Set Outside Hebel",
      gasPipes: "Completed",
      waterPipes: "Completed",
      sarkingInstalled: "Completed",
      windowsInstalled: "Completed",
      windowReveals: "Correct",
      doorsInstalled: "Not Complete",
      doorJambReveals: "Wrong for Batten Size",
      slidersInstalled: "Completed",
      garageDoorJamb: "Not Complete",
      garageDoorJambWidth: "Working on it",
      garageHead: "Not Correct",
      garageHeadNotes: "Timber needed on underside of steel beam for top hat fixing",
      frameToFacia: "Correct",
      edgeProtectionRemoved: "Not Complete",
      scaffoldRemoval: "Needs to be Removed",
      zeroBoundaryInstallation: "Cannot Install",
      zeroBoundaryNotes: "Block wall - no hebel",
      frameCheck: "Completed",
      pierFraming: "1x Pier Frame",
      additionalFraming: "Required",
      framingNotes: "Timber bracing to be removed from whole job",
      slabRebate: "0-2Lm",
      soilHeight: "100-150mm",
      soilHeightNotes: "Soil height is close to slab height around whole job",
      termiteBarrierPierSlab: "0x Pier to Slab",
      termiteBarrierPierFooting: "0x Pier to Footing",
      termiteBarrierOrdered: "N/A",
    },
    generalNotes: ["All notes"],
    options: {
      includeCoverPage: true,
      includeSummary: true,
      includeOutstandingItems: true,
      includePhotographs: true,
      includePageNumbers: true,
    },
  };

  const viewModel = ReportDataService.buildViewModel(sampleMetadata, template, processedImages);
  const html = await PdfRenderingService.renderHtml(viewModel);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 850, height: 1200 } });
  await page.setContent(html, { waitUntil: "load" });

  const pageElements = await page.$$(".page");
  console.log(`Found ${pageElements.length} pages in HTML layout.`);

  for (let i = 0; i < pageElements.length; i++) {
    const outPath = path.join(process.cwd(), `preview_page_${i + 1}.png`);
    await pageElements[i].screenshot({ path: outPath });
    console.log(`Saved screenshot: ${outPath}`);
  }

  await browser.close();
}

capturePreviews().catch(console.error);
