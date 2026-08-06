import fs from "fs";
import path from "path";

const STORAGE_DIR = path.join(process.cwd(), "temporary_reports");

export class StorageService {
  public static init(): void {
    if (!fs.existsSync(STORAGE_DIR)) {
      fs.mkdirSync(STORAGE_DIR, { recursive: true });
    }
  }

  public static savePdf(fileName: string, pdfBuffer: Buffer): string {
    this.init();
    const filePath = path.join(STORAGE_DIR, fileName);
    fs.writeFileSync(filePath, pdfBuffer);
    return `/api/v1/inspection-reports/download/${fileName}`;
  }

  public static getPdfPath(fileName: string): string | null {
    const filePath = path.join(STORAGE_DIR, fileName);
    if (fs.existsSync(filePath)) {
      return filePath;
    }
    return null;
  }
}
