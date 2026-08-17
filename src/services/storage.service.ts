import fs from "fs";
import path from "path";

const STORAGE_DIR = path.join(process.cwd(), "temporary_reports");

export class StorageService {
  private static lastGeneratedFile: string | null = null;

  public static init(): void {
    if (!fs.existsSync(STORAGE_DIR)) {
      fs.mkdirSync(STORAGE_DIR, { recursive: true });
    }
  }

  public static savePdf(fileName: string, pdfBuffer: Buffer): string {
    this.init();
    const filePath = path.join(STORAGE_DIR, fileName);
    fs.writeFileSync(filePath, pdfBuffer);
    this.lastGeneratedFile = fileName;
    return `/api/v1/inspection-reports/download/${fileName}`;
  }

  public static getPdfPath(fileName: string): string | null {
    const filePath = path.join(STORAGE_DIR, fileName);
    if (fs.existsSync(filePath)) {
      return filePath;
    }
    return null;
  }

  public static getLatestPdf(): { fileName: string; filePath: string; mtime: Date } | null {
    this.init();

    if (this.lastGeneratedFile) {
      const p = path.join(STORAGE_DIR, this.lastGeneratedFile);
      if (fs.existsSync(p)) {
        const stat = fs.statSync(p);
        return { fileName: this.lastGeneratedFile, filePath: p, mtime: stat.mtime };
      }
    }

    if (!fs.existsSync(STORAGE_DIR)) return null;

    const files = fs.readdirSync(STORAGE_DIR).filter((f) => f.endsWith(".pdf"));
    if (files.length === 0) return null;

    let newestFile = files[0];
    let newestMtime = 0;

    for (const file of files) {
      const p = path.join(STORAGE_DIR, file);
      const stat = fs.statSync(p);
      if (stat.mtimeMs > newestMtime) {
        newestMtime = stat.mtimeMs;
        newestFile = file;
      }
    }

    return {
      fileName: newestFile,
      filePath: path.join(STORAGE_DIR, newestFile),
      mtime: new Date(newestMtime),
    };
  }
}
