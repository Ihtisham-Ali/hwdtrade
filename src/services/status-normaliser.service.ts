export type StatusCategory =
  | "completed"
  | "correct"
  | "in_progress"
  | "attention"
  | "partially_completed"
  | "cannot_install"
  | "not_required"
  | "ordered"
  | "informational"
  | "unknown";

export type StatusColor = "green" | "yellow" | "red";

export interface NormalisedStatus {
  rawAnswer: string;
  category: StatusCategory;
  color: StatusColor;
  displayLabel: string;
  icon: string;
  badgeClass: string;
  isCompliant: boolean;
  requiresAction: boolean;
}

export type ReportKey =
  | "HSC1"
  | "HSC2"
  | "HSC3"
  | "HSC4"
  | "RSC1"
  | "RSC2"
  | "RSC3"
  | "RSC4"
  | "DEFAULT";

export function detectReportKey(
  templateId?: string,
  reportId?: string,
  siteChecksCompleted?: string,
  reportTitle?: string
): ReportKey {
  const tid = (templateId || "").trim().toUpperCase();
  if (tid === "HSC1" || tid === "LOWER-HEBEL-SITE-CHECK-1") return "HSC1";
  if (tid === "HSC2") return "HSC2";
  if (tid === "HSC3") return "HSC3";
  if (tid === "HSC4") return "HSC4";
  if (tid === "RSC1") return "RSC1";
  if (tid === "RSC2") return "RSC2";
  if (tid === "RSC3") return "RSC3";
  if (tid === "RSC4") return "RSC4";

  const combined = `${templateId || ""} ${reportId || ""} ${siteChecksCompleted || ""} ${reportTitle || ""}`.toUpperCase();

  // Explicit check codes
  if (combined.includes("HSC1")) return "HSC1";
  if (combined.includes("HSC2")) return "HSC2";
  if (combined.includes("HSC3")) return "HSC3";
  if (combined.includes("HSC4")) return "HSC4";
  if (combined.includes("RSC1")) return "RSC1";
  if (combined.includes("RSC2")) return "RSC2";
  if (combined.includes("RSC3")) return "RSC3";
  if (combined.includes("RSC4")) return "RSC4";

  // Descriptive Render checks
  if (combined.includes("PRE UPPER RENDER") || (combined.includes("RENDER") && combined.includes("CHECK 1"))) return "RSC1";
  if (combined.includes("POST UPPER RENDER") || (combined.includes("RENDER") && combined.includes("CHECK 2"))) return "RSC2";
  if (combined.includes("PRE LOWER RENDER") || (combined.includes("RENDER") && combined.includes("CHECK 3"))) return "RSC3";
  if (combined.includes("POST LOWER RENDER") || (combined.includes("RENDER") && combined.includes("CHECK 4"))) return "RSC4";

  // Descriptive Hebel checks
  if (combined.includes("PRE UPPER HEBEL") || (combined.includes("HEBEL") && combined.includes("CHECK 2"))) return "HSC2";
  if (combined.includes("POST UPPER HEBEL") || (combined.includes("HEBEL") && combined.includes("CHECK 3"))) return "HSC3";
  if (combined.includes("POST LOWER HEBEL") || (combined.includes("HEBEL") && combined.includes("CHECK 4"))) return "HSC4";
  if (combined.includes("LOWER HEBEL") || combined.includes("CHECK 1")) return "HSC1";

  return "DEFAULT";
}

function cleanText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[*_]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * HSC1 Matching Rules
 */
export function matchHSC1(raw: string): StatusColor {
  const norm = cleanText(raw);
  if (!norm) return "yellow";

  // Red
  if (
    norm === "not ready for hsc1" ||
    norm.includes("not ready") ||
    norm === "wrong" ||
    norm.startsWith("wrong ") ||
    norm.includes("wrong for batten size") ||
    norm === "no power" ||
    norm.includes("no power") ||
    norm === "needs emptying" ||
    norm.includes("needs emptying") ||
    norm === "site clean required" ||
    norm.includes("in the way of hebel install") ||
    norm.includes("in the way of the hebel install") ||
    norm === "not correct" ||
    norm.includes("full frame check required") ||
    norm.includes("needs adjusting") ||
    norm.includes("needs to be removed") ||
    norm.includes("cannot install") ||
    norm === "required" ||
    norm === "n/a" ||
    norm === "na"
  ) {
    return "red";
  }

  // Green
  if (
    norm === "site ready for hsc1" ||
    norm.includes("site ready") ||
    norm === "correct for frame type" ||
    norm.includes("correct for frame") ||
    norm === "completed" ||
    norm === "complete" ||
    norm.includes("water onsite") ||
    norm.includes("water on-site") ||
    norm === "not required" ||
    norm.includes("stud cavity") ||
    norm === "correct" ||
    norm.startsWith("correct ") ||
    norm === "can install" ||
    norm.includes("ordered by hwd") ||
    norm === "yes"
  ) {
    return "green";
  }

  return "yellow";
}

/**
 * HSC2 Matching Rules
 * Green:
 * - Power On-site
 * - Water On-Site
 * - Not Required
 * - Complete
 * - Correct (<250mm)
 * - Completed
 * - Correct
 *
 * Red:
 * - No Power On-site
 * - No Water On-Site
 * - Needs Emptying
 * - Site Clean Required
 * - Not Complete
 * - Needs Adjusting (<100mm)
 * - Not Completed
 * - Wrong for Batten Size
 * - ***Needs Adjusting***
 * - Needs to Be Removed
 * - Required
 */
export function matchHSC2(raw: string): StatusColor {
  const norm = cleanText(raw);
  if (!norm) return "yellow";

  // Red
  if (
    norm.includes("no power") ||
    norm.includes("no water") ||
    norm.includes("needs emptying") ||
    norm.includes("site clean required") ||
    norm === "not complete" ||
    norm === "not completed" ||
    norm.includes("not complete") ||
    norm.includes("not completed") ||
    norm.includes("needs adjusting") ||
    norm.includes("wrong for batten size") ||
    norm.includes("needs to be removed") ||
    norm === "required"
  ) {
    return "red";
  }

  // Green
  if (
    norm.includes("power on-site") ||
    norm.includes("power onsite") ||
    norm.includes("water on-site") ||
    norm.includes("water onsite") ||
    norm === "not required" ||
    norm === "complete" ||
    norm === "completed" ||
    norm.includes("correct")
  ) {
    return "green";
  }

  return "yellow";
}

/**
 * HSC3 Matching Rules
 * Green:
 * - Complete
 * - Hebel Cut Tight to Vent
 * - Good
 * - Yes
 * - Not Required
 *
 * Red:
 * - Not Complete
 * - Hole Cut to Big
 * - Bad
 * - No
 * - Required
 */
export function matchHSC3(raw: string): StatusColor {
  const norm = cleanText(raw);
  if (!norm) return "yellow";

  // Red
  if (
    norm === "not complete" ||
    norm.includes("not complete") ||
    norm.includes("hole cut to big") ||
    norm.includes("hole cut too big") ||
    norm === "bad" ||
    norm === "no" ||
    norm === "required"
  ) {
    return "red";
  }

  // Green
  if (
    norm === "complete" ||
    norm === "completed" ||
    norm.includes("hebel cut tight") ||
    norm.includes("cut tight to vent") ||
    norm === "good" ||
    norm === "yes" ||
    norm === "not required"
  ) {
    return "green";
  }

  return "yellow";
}

/**
 * HSC4 Matching Rules
 * Green:
 * - Completed
 * - Complete
 * - Good
 * - Not Required
 *
 * Red:
 * - Not Completed
 * - Hole Cut to Big
 * - Not Complete
 * - Bad
 * - Required
 */
export function matchHSC4(raw: string): StatusColor {
  const norm = cleanText(raw);
  if (!norm) return "yellow";

  // Red
  if (
    norm === "not completed" ||
    norm === "not complete" ||
    norm.includes("not completed") ||
    norm.includes("not complete") ||
    norm.includes("hole cut to big") ||
    norm.includes("hole cut too big") ||
    norm === "bad" ||
    norm === "required"
  ) {
    return "red";
  }

  // Green
  if (
    norm === "completed" ||
    norm === "complete" ||
    norm === "good" ||
    norm === "not required"
  ) {
    return "green";
  }

  return "yellow";
}

/**
 * RSC1 Matching Rules
 * Green:
 * - Complete
 * - Correct (<250mm)
 *
 * Red:
 * - Not Complete
 * - Needs Adjusting (<100mm)
 */
export function matchRSC1(raw: string): StatusColor {
  const norm = cleanText(raw);
  if (!norm) return "yellow";

  // Red
  if (
    norm === "not complete" ||
    norm.includes("not complete") ||
    norm.includes("needs adjusting")
  ) {
    return "red";
  }

  // Green
  if (
    norm === "complete" ||
    norm === "completed" ||
    norm.includes("correct")
  ) {
    return "green";
  }

  return "yellow";
}

/**
 * RSC2 Matching Rules
 * Green:
 * - Complete
 * - Not Required
 * - Good
 * - Yes
 *
 * Red:
 * - Stuck
 * - Required
 * - Bad
 * - Not Complete
 */
export function matchRSC2(raw: string): StatusColor {
  const norm = cleanText(raw);
  if (!norm) return "yellow";

  // Red
  if (
    norm === "stuck" ||
    norm.includes("stuck") ||
    norm === "required" ||
    norm === "bad" ||
    norm === "not complete" ||
    norm.includes("not complete")
  ) {
    return "red";
  }

  // Green
  if (
    norm === "complete" ||
    norm === "completed" ||
    norm === "not required" ||
    norm === "good" ||
    norm === "yes"
  ) {
    return "green";
  }

  return "yellow";
}

/**
 * RSC3 Matching Rules
 * Green:
 * - Correct
 * - Plus 150mm
 * - Complete
 * - Yes
 *
 * Red:
 * - Need Chipping Back
 * - Less Than 100mm
 * - Not Complete
 * - No Tiles Installed
 * - No
 */
export function matchRSC3(raw: string): StatusColor {
  const norm = cleanText(raw);
  if (!norm) return "yellow";

  // Red
  if (
    norm.includes("chipping back") ||
    norm.includes("less than 100mm") ||
    norm.includes("less than 100") ||
    norm === "not complete" ||
    norm.includes("not complete") ||
    norm.includes("no tiles installed") ||
    norm === "no"
  ) {
    return "red";
  }

  // Green
  if (
    norm.includes("correct") ||
    norm.includes("plus 150mm") ||
    norm.includes("plus 150") ||
    norm.includes("150mm") ||
    norm === "complete" ||
    norm === "completed" ||
    norm === "yes"
  ) {
    return "green";
  }

  return "yellow";
}

/**
 * RSC4 Matching Rules
 * Green:
 * - Complete
 * - Good
 * - Done
 * - Not Required
 *
 * Red:
 * - Required
 * - Stuck
 * - Not Complete
 */
export function matchRSC4(raw: string): StatusColor {
  const norm = cleanText(raw);
  if (!norm) return "yellow";

  // Red
  if (
    norm === "required" ||
    norm === "stuck" ||
    norm.includes("stuck") ||
    norm === "not complete" ||
    norm.includes("not complete")
  ) {
    return "red";
  }

  // Green
  if (
    norm === "complete" ||
    norm === "completed" ||
    norm === "good" ||
    norm === "done" ||
    norm === "not required"
  ) {
    return "green";
  }

  return "yellow";
}

/**
 * Default fallback matching for any other reports
 */
export function matchDefault(raw: string): StatusColor {
  const norm = cleanText(raw);
  if (!norm) return "yellow";

  if (
    norm.includes("cannot install") ||
    norm.includes("failed") ||
    norm.includes("wrong") ||
    norm.includes("not complete") ||
    norm.includes("not correct") ||
    norm.includes("repair") ||
    norm.includes("attention") ||
    norm.includes("bad") ||
    norm.includes("no power")
  ) {
    return "red";
  }

  if (
    norm.includes("completed") ||
    norm.includes("complete") ||
    norm.includes("correct") ||
    norm === "good" ||
    norm === "yes" ||
    norm === "not required" ||
    norm === "pass"
  ) {
    return "green";
  }

  return "yellow";
}

export class StatusNormaliserService {
  public static normalise(
    rawAnswer: string | undefined | null,
    reportKey: ReportKey = "HSC1"
  ): NormalisedStatus {
    const trimmed = (rawAnswer || "").trim();

    if (!trimmed || trimmed === "Not Provided") {
      return {
        rawAnswer: rawAnswer || "Not Provided",
        category: "in_progress",
        color: "yellow",
        displayLabel: "In Progress",
        icon: "●",
        badgeClass: "badge b-yellow b-progress",
        isCompliant: false,
        requiresAction: false,
      };
    }

    let color: StatusColor;
    switch (reportKey) {
      case "HSC1":
        color = matchHSC1(trimmed);
        break;
      case "HSC2":
        color = matchHSC2(trimmed);
        break;
      case "HSC3":
        color = matchHSC3(trimmed);
        break;
      case "HSC4":
        color = matchHSC4(trimmed);
        break;
      case "RSC1":
        color = matchRSC1(trimmed);
        break;
      case "RSC2":
        color = matchRSC2(trimmed);
        break;
      case "RSC3":
        color = matchRSC3(trimmed);
        break;
      case "RSC4":
        color = matchRSC4(trimmed);
        break;
      default:
        color = matchDefault(trimmed);
        break;
    }

    const norm = cleanText(trimmed);

    if (color === "green") {
      return {
        rawAnswer: trimmed,
        category: "completed",
        color: "green",
        displayLabel: trimmed,
        icon: "✓",
        badgeClass: "badge b-green b-done",
        isCompliant: true,
        requiresAction: false,
      };
    }

    if (color === "red") {
      const isCannotInstall = norm.includes("cannot install");
      return {
        rawAnswer: trimmed,
        category: isCannotInstall ? "cannot_install" : "attention",
        color: "red",
        displayLabel: trimmed,
        icon: isCannotInstall ? "✕" : "!",
        badgeClass: isCannotInstall ? "badge b-red b-crit b-attn" : "badge b-red b-attn",
        isCompliant: false,
        requiresAction: true,
      };
    }

    // Yellow: In Progress
    return {
      rawAnswer: trimmed,
      category: "in_progress",
      color: "yellow",
      displayLabel: trimmed,
      icon: "●",
      badgeClass: "badge b-yellow b-progress",
      isCompliant: false,
      requiresAction: false,
    };
  }
}
