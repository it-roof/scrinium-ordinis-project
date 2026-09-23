/**
 * Full pseudonym pipeline: Stufe 1 (DB+patterns) → Stufe 2 (local NER) → residuals.
 * Pure — safe for Vitest.
 */

import {
  getPseudonymGatePolicy,
  type PseudonymGatePolicy,
} from "@/lib/ai/gate-policy";
import {
  AI_DISMISSED_RESIDUALS_MAX,
  AI_MANUAL_MARK_MAX_CHARS,
  AI_MANUAL_MARKS_MAX,
  clampStringList,
} from "@/lib/ai/limits";
import {
  detectLocalEntities,
  filterDismissedResiduals,
  filterNovelNerEntities,
  findResidualSpans,
  sanitizeManualMarks,
} from "@/lib/ai/ner-local";
import {
  applyManualMarks,
  pseudonymize,
  type KnownEntity,
  type PseudonymizeResult,
} from "@/lib/ai/pseudonymize";

export type PseudonymPipelineResult = {
  text: string;
  mapping: Map<string, string>;
  placeholderCount: number;
  /** After Stufe 1 only (no NER). */
  stage1Text: string;
  stage1PlaceholderCount: number;
  nerEntities: KnownEntity[];
  /** Residuals still open after marks + allowed dismissals. */
  residuals: string[];
  /** Residuals before dismiss filter (for validating client dismissals). */
  residualsBeforeDismiss: string[];
  gatePolicy: PseudonymGatePolicy;
  appliedMarks: string[];
  appliedDismissals: string[];
};

export function runPseudonymPipeline(
  facts: string,
  knownEntities: KnownEntity[],
  options?: {
    manualMarks?: string[];
    dismissedResiduals?: string[];
    env?: { AI_PSEUDONYM_GATE?: string | undefined };
  }
): PseudonymPipelineResult {
  const gatePolicy = getPseudonymGatePolicy(options?.env);

  const stage1 = pseudonymize(facts, knownEntities);
  const nerRaw = detectLocalEntities(stage1.text);
  const nerEntities = filterNovelNerEntities(nerRaw, knownEntities);

  let combined: PseudonymizeResult = pseudonymize(facts, [
    ...knownEntities,
    ...nerEntities,
  ]);

  const appliedMarks = sanitizeManualMarks(
    combined.text,
    options?.manualMarks ?? [],
    AI_MANUAL_MARKS_MAX,
    AI_MANUAL_MARK_MAX_CHARS
  );

  if (appliedMarks.length > 0) {
    combined = applyManualMarks(combined.text, appliedMarks, combined.mapping);
  }

  const residualsBeforeDismiss = findResidualSpans(combined.text);
  const requestedDismissals = clampStringList(
    options?.dismissedResiduals,
    AI_DISMISSED_RESIDUALS_MAX,
    AI_MANUAL_MARK_MAX_CHARS
  );
  // Only dismissals that match a detected residual are honored
  const allowedDismissKeys = new Set(
    residualsBeforeDismiss.map((r) => r.toLowerCase())
  );
  const appliedDismissals = requestedDismissals.filter((d) =>
    allowedDismissKeys.has(d.toLowerCase())
  );
  const residuals = filterDismissedResiduals(
    residualsBeforeDismiss,
    appliedDismissals
  );

  return {
    text: combined.text,
    mapping: combined.mapping,
    placeholderCount: combined.placeholderCount,
    stage1Text: stage1.text,
    stage1PlaceholderCount: stage1.placeholderCount,
    nerEntities,
    residuals,
    residualsBeforeDismiss,
    gatePolicy,
    appliedMarks,
    appliedDismissals,
  };
}

export function assertResidualsCleared(
  residuals: string[],
  gatePolicy: PseudonymGatePolicy
): { ok: true } | { ok: false; residuals: string[] } {
  if (gatePolicy === "warn") return { ok: true };
  if (residuals.length === 0) return { ok: true };
  return { ok: false, residuals };
}
