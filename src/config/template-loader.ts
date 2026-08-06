import fs from "fs";
import path from "path";
import { InspectionTemplateConfig, InspectionTemplateConfigSchema } from "../schemas/template.schema.js";

const TEMPLATE_DIR = path.join(process.cwd(), "src", "config", "inspection-templates");

export class TemplateLoader {
  private static templatesCache: Map<string, InspectionTemplateConfig> = new Map();

  public static getTemplate(templateId: string): InspectionTemplateConfig {
    if (this.templatesCache.has(templateId)) {
      return this.templatesCache.get(templateId)!;
    }

    const filePath = path.join(TEMPLATE_DIR, `${templateId}.json`);
    if (!fs.existsSync(filePath)) {
      // Fallback to lower-hebel-site-check-1 if specific template not found
      const fallbackPath = path.join(TEMPLATE_DIR, "lower-hebel-site-check-1.json");
      if (!fs.existsSync(fallbackPath)) {
        throw new Error(`Inspection template '${templateId}' not found and default fallback missing.`);
      }
      const fallbackRaw = fs.readFileSync(fallbackPath, "utf-8");
      const fallbackJson = JSON.parse(fallbackRaw);
      const validated = InspectionTemplateConfigSchema.parse(fallbackJson);
      this.templatesCache.set(templateId, validated);
      return validated;
    }

    const raw = fs.readFileSync(filePath, "utf-8");
    const json = JSON.parse(raw);
    const validated = InspectionTemplateConfigSchema.parse(json);
    this.templatesCache.set(templateId, validated);
    return validated;
  }

  public static listAvailableTemplates(): string[] {
    if (!fs.existsSync(TEMPLATE_DIR)) return ["lower-hebel-site-check-1"];
    const files = fs.readdirSync(TEMPLATE_DIR);
    return files
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.replace(".json", ""));
  }
}
