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

    // 1. Cannot Install / Failed / Urgent Blocker (checked first: highest severity)
    if (
      lower.includes("cannot install") ||
      lower.includes("failed") ||
      lower.includes("blocked") ||
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

    // 2. Partially Completed / Attention Required / negative modifiers
    // (checked before the positive "complete"/"correct" matches below, so
    // phrases like "Not Complete" or "Incorrect" are never misread as positive)
    if (
      lower.includes("partially") ||
      lower.includes("partial") ||
      lower.includes("fix") ||
      lower.includes("attention") ||
      lower.includes("incomplete") ||
      lower.includes("incorrect") ||
      lower.includes("repair") ||
      lower.includes("not complete") ||
      lower.includes("not correct") ||
      lower.includes("working on it") ||
      lower.includes("wrong for") ||
      lower.includes("needs to be") ||
      lower.includes("no power")
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

    // 3. Not Required / N/A
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

    // 4. Completed — matches "Completed", "Complete", "100% Complete", etc.
    // for any report type, since negative phrasing was already ruled out above.
    if (lower.includes("complete") || lower === "yes" || lower === "done" || lower.includes("100%")) {
      return {
        rawAnswer: trimmed,
        category: "completed",
        displayLabel: trimmed,
        icon: "✓",
        badgeClass: "badge b-done",
        isCompliant: true,
        requiresAction: false,
      };
    }

    // 5. Correct — matches "Correct", "Correct (<250mm)", etc.
    if (lower.includes("correct") || lower === "pass" || lower === "ok" || lower === "good") {
      return {
        rawAnswer: trimmed,
        category: "correct",
        displayLabel: trimmed,
        icon: "✓",
        badgeClass: "badge b-done",
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

    // 7. Informational / Descriptive — e.g. "Power On-site", "Half Full".
    // Not flagged as an issue, so it still counts as a non-issue answer.
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
