import type { ThresholdFlag } from "@/types/schema";

export interface ThresholdInput {
  rolling12MoSpendCents: number;
  replacementCostCents: number | null;
  yellowPct: number;
  redPct: number;
}

export interface ThresholdResult {
  ratio: number | null;
  flag: ThresholdFlag;
}

/**
 * Pure derivation of the rolling-12mo threshold flag. No side effects, no DB.
 * Returns `insufficient_data` when replacement cost is unknown or zero.
 *
 * Defaults per plan: yellow at 0.45, red at 0.60. Organizations may tune.
 */
export function computeThreshold(input: ThresholdInput): ThresholdResult {
  const { rolling12MoSpendCents, replacementCostCents, yellowPct, redPct } = input;
  if (!replacementCostCents || replacementCostCents <= 0) {
    return { ratio: null, flag: "insufficient_data" };
  }
  const ratio = rolling12MoSpendCents / replacementCostCents;
  if (ratio >= redPct) return { ratio, flag: "red" };
  if (ratio >= yellowPct) return { ratio, flag: "yellow" };
  return { ratio, flag: "green" };
}
