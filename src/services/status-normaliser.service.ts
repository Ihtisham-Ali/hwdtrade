export type StatusCategory =
  | "completed"
  | "correct"
  | "attention"
  | "partially_completed"
  | "cannot_install"
  | "not_required"
  | "ordered"
  | "informational"
  | "unknown";

export interface NormalisedStatus {
  rawAnswer: string;
  category: StatusCategory;
  displayLabel: string;
  icon: string;
  badgeClass: string;
  isCompliant: boolean;
  requiresAction: boolean;
}

export class StatusNormaliserService {
  public static normalise(rawAnswer: string | undefined | null): NormalisedStatus {
    if (!rawAnswer || rawAnswer.trim() === "" || rawAnswer === "Not Provided") {
      return {
        rawAnswer: rawAnswer || "Not Provided",
        category: "unknown",
        displayLabel: "Not Provided",
        icon: "—",
        badgeClass: "badge-neutral",
        isCompliant: false,
        requiresAction: false,
      };
    }

    const trimmed = rawAnswer.trim();
    const lower = trimmed.toLowerCase();

    // 1. Completed
    if (lower === "completed" || lower === "yes" || lower === "done" || lower.includes("100%")) {
      return {
        rawAnswer: trimmed,
        category: "completed",
        displayLabel: "Completed",
        icon: "✓",
        badgeClass: "badge b-done",
        isCompliant: true,
        requiresAction: false,
      };
    }

    // 2. Correct
    if (lower === "correct" || lower === "pass" || lower === "ok" || lower === "good") {
      return {
        rawAnswer: trimmed,
        category: "correct",
        displayLabel: "Correct",
        icon: "✓",
        badgeClass: "badge b-done",
        isCompliant: true,
        requiresAction: false,
      };
    }

    // 3. Partially Completed / Attention Required
    if (
      lower.includes("partially") ||
      lower.includes("partial") ||
      lower.includes("fix") ||
      lower.includes("attention") ||
      lower.includes("incomplete") ||
      lower.includes("repair") ||
      lower.includes("not complete") ||
      lower.includes("not correct") ||
      lower.includes("working on it") ||
      lower.includes("wrong for") ||
      lower.includes("needs to be") ||
      lower.includes("required")
    ) {
      return {
        rawAnswer: trimmed,
        category: "attention",
        displayLabel: trimmed,
        icon: "!",
        badgeClass: "badge b-attn",
        isCompliant: false,
        requiresAction: true,
      };
    }

    // 4. Cannot Install / Failed / Urgent Issue
    if (
      lower.includes("cannot install") ||
      lower.includes("failed") ||
      lower.includes("blocked") ||
      lower.includes("issue") ||
      lower.includes("no access")
    ) {
      return {
        rawAnswer: trimmed,
        category: "cannot_install",
        displayLabel: trimmed,
        icon: "✕",
        badgeClass: "badge b-crit",
        isCompliant: false,
        requiresAction: true,
      };
    }

    // 5. Not Required / N/A
    if (
      lower === "not required" ||
      lower === "n/a" ||
      lower === "none" ||
      lower === "no" ||
      lower.includes("0x pier")
    ) {
      return {
        rawAnswer: trimmed,
        category: "not_required",
        displayLabel: trimmed,
        icon: "—",
        badgeClass: "badge b-na",
        isCompliant: true,
        requiresAction: false,
      };
    }

    // 6. Ordered / Pending Delivery
    if (lower.includes("ordered") || lower.includes("pending")) {
      return {
        rawAnswer: trimmed,
        category: "ordered",
        displayLabel: trimmed,
        icon: "",
        badgeClass: "badge b-info",
        isCompliant: true,
        requiresAction: false,
      };
    }

    // 7. Informational / Descriptive
    return {
      rawAnswer: trimmed,
      category: "informational",
      displayLabel: trimmed,
      icon: "",
      badgeClass: "badge b-info",
      isCompliant: true,
      requiresAction: false,
    };
  }
}
