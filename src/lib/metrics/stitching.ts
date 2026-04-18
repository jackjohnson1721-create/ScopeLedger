/**
 * Stitching: attach a LLM-extracted candidate to a concrete scope_identity.
 *
 * Inputs come from the extractor (candidate_oem_serial_number / asset_tag,
 * possibly noisy) and the org's scope_identity rows. We return a confidence
 * score in [0, 1] plus the best match. The ingestion flow treats anything
 * below STITCH_AUTO_PROMOTE as HITL-required.
 */

export interface CandidateIdentity {
  candidate_oem_serial_number: string | null;
  candidate_asset_tag: string | null;
}

export interface ScopeRow {
  id: string;
  oem_serial_number: string | null;
  asset_tag: string | null;
  internal_id: string | null;
}

export interface StitchResult {
  scope_id: string | null;
  confidence: number;
  matched_on: "oem_serial_number" | "asset_tag" | "internal_id" | "fuzzy" | "none";
}

export const STITCH_AUTO_PROMOTE = 0.9;

/**
 * Deterministic stitching. Case-insensitive, ignores whitespace and
 * non-alphanumerics so "A-12345" matches "A12345".
 */
export function stitchCandidate(
  candidate: CandidateIdentity,
  scopes: ScopeRow[],
): StitchResult {
  const canSerial = normalize(candidate.candidate_oem_serial_number);
  const canTag = normalize(candidate.candidate_asset_tag);

  if (canSerial) {
    const exact = scopes.find((s) => normalize(s.oem_serial_number) === canSerial);
    if (exact) return { scope_id: exact.id, confidence: 1.0, matched_on: "oem_serial_number" };
  }
  if (canTag) {
    const exact = scopes.find((s) => normalize(s.asset_tag) === canTag);
    if (exact) return { scope_id: exact.id, confidence: 0.95, matched_on: "asset_tag" };
  }
  if (canSerial) {
    const internal = scopes.find((s) => normalize(s.internal_id) === canSerial);
    if (internal) return { scope_id: internal.id, confidence: 0.9, matched_on: "internal_id" };
  }

  // Fuzzy: best Levenshtein similarity against serial numbers.
  if (canSerial) {
    let best: { id: string; sim: number } | null = null;
    for (const s of scopes) {
      const sSerial = normalize(s.oem_serial_number);
      if (!sSerial) continue;
      const sim = similarity(canSerial, sSerial);
      if (!best || sim > best.sim) best = { id: s.id, sim };
    }
    if (best && best.sim >= 0.8) {
      return { scope_id: best.id, confidence: best.sim, matched_on: "fuzzy" };
    }
  }

  return { scope_id: null, confidence: 0, matched_on: "none" };
}

function normalize(v: string | null | undefined): string {
  if (!v) return "";
  return v.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function similarity(a: string, b: string): number {
  if (!a.length && !b.length) return 1;
  const dist = levenshtein(a, b);
  return 1 - dist / Math.max(a.length, b.length);
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const prev = new Array<number>(n + 1);
  const cur = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    cur[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(
        (cur[j - 1] ?? 0) + 1,
        (prev[j] ?? 0) + 1,
        (prev[j - 1] ?? 0) + cost,
      );
    }
    for (let j = 0; j <= n; j++) prev[j] = cur[j] ?? 0;
  }
  return prev[n] ?? 0;
}
