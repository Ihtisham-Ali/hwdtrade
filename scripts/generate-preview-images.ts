import fs from "fs";
import path from "path";
import { chromium } from "playwright";
import { InspectionMetadata } from "../src/schemas/inspection.schema.js";
import { TemplateLoader } from "../src/config/template-loader.js";
import { ReportDataService } from "../src/services/report-data.service.js";
import { PdfRenderingService } from "../src/services/pdf-rendering.service.js";
import { ImageProcessingService, ProcessedImage } from "../src/services/image-processing.service.js";

async function main() {
  const sampleMetadata: InspectionMetadata = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "public", "index.html"), "utf-8").match(/const sampleMetadata = ({[\s\S]*?});/)?.[1] || "{}"
  );

  const template = TemplateLoader.getTemplate(sampleMetadata.templateId);
  const viewModel = ReportDataService.buildViewModel(sampleMetadata, template, []);
  const html = await PdfRenderingService.renderHtml(viewModel);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1200, height: 1600 } });
  await page.setContent(html, { waitUntil: "load" });

  await page.screenshot({ path: path.join(process.cwd(), "sample_cover_preview.png"), fullPage: false });
  console.log("📸 Saved sample_cover_preview.png");

  await browser.close();
}

main().catch(console.error);
