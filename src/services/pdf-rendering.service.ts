import fs from "fs";
import path from "path";
import handlebars from "handlebars";
import { chromium, Browser } from "playwright";
import { ReportViewModel } from "./report-data.service.js";

const TEMPLATE_PATH = path.join(process.cwd(), "src", "templates", "inspection-report.hbs");
const CSS_PATH = path.join(process.cwd(), "src", "templates", "styles.css");

export class PdfRenderingService {
  private static browserInstance: Browser | null = null;

  private static async getBrowser(): Promise<Browser> {
    if (!this.browserInstance || !this.browserInstance.isConnected()) {
      this.browserInstance = await chromium.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
      });
    }
    return this.browserInstance;
  }

  public static async closeBrowser(): Promise<void> {
    if (this.browserInstance) {
      await this.browserInstance.close();
      this.browserInstance = null;
    }
  }

  public static async renderHtml(viewModel: ReportViewModel): Promise<string> {
    const hbsSource = fs.readFileSync(TEMPLATE_PATH, "utf-8");
    const cssSource = fs.readFileSync(CSS_PATH, "utf-8");

    const template = handlebars.compile(hbsSource);
    const html = template({
      ...viewModel,
      cssContent: cssSource,
    });

    return html;
  }

  public static async generatePdfBuffer(viewModel: ReportViewModel): Promise<Buffer> {
    const html = await this.renderHtml(viewModel);
    const browser = await this.getBrowser();
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.setContent(html, { waitUntil: "load" });

      const includePageNumbers = viewModel.metadata.options?.includePageNumbers ?? true;

      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "0mm", bottom: "0mm", left: "0mm", right: "0mm" },
        displayHeaderFooter: includePageNumbers,
        headerTemplate: `<div style="font-size: 0px;"></div>`,
        footerTemplate: includePageNumbers
          ? `<div style="font-size: 8px; font-family: 'Inter', sans-serif; color: #64748B; width: 100%; padding: 0 18mm 8mm 18mm; display: flex; justify-content: space-between; box-sizing: border-box;">
              <span>Site Inspection Report &bull; ${viewModel.metadata.reportId}</span>
              <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
            </div>`
          : `<div style="font-size: 0px;"></div>`,
      });

      return Buffer.from(pdfBuffer);
    } finally {
      await page.close();
      await context.close();
    }
  }
}
