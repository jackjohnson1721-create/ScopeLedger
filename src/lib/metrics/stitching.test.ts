import { describe, expect, it } from "vitest";
import { stitchCandidate, STITCH_AUTO_PROMOTE } from "./stitching";

const scope = (over: Partial<Parameters<typeof stitchCandidate>[1][number]>) => ({
  id: "s1",
  oem_serial_number: null,
  asset_tag: null,
  internal_id: null,
  ...over,
});

describe("stitchCandidate", () => {
  it("matches exact OEM serial ignoring punctuation", () => {
    const res = stitchCandidate(
      { candidate_oem_serial_number: "A-123 45", candidate_asset_tag: null },
      [scope({ id: "s1", oem_serial_number: "A12345" })],
    );
    expect(res).toMatchObject({ scope_id: "s1", confidence: 1, matched_on: "oem_serial_number" });
    expect(res.confidence).toBeGreaterThanOrEqual(STITCH_AUTO_PROMOTE);
  });

  it("falls through to asset tag when serial absent", () => {
    const res = stitchCandidate(
      { candidate_oem_serial_number: null, candidate_asset_tag: "BIO-778" },
      [scope({ id: "s2", asset_tag: "bio778" })],
    );
    expect(res.scope_id).toBe("s2");
    expect(res.matched_on).toBe("asset_tag");
  });

  it("matches against internal_id as a last exact match", () => {
    const res = stitchCandidate(
      { candidate_oem_serial_number: "INT-42", candidate_asset_tag: null },
      [scope({ id: "s3", internal_id: "int42" })],
    );
    expect(res.scope_id).toBe("s3");
    expect(res.matched_on).toBe("internal_id");
  });

  it("fuzzy-matches a one-character off serial", () => {
    const res = stitchCandidate(
      { candidate_oem_serial_number: "A12345", candidate_asset_tag: null },
      [scope({ id: "s4", oem_serial_number: "A12346" })],
    );
    expect(res.scope_id).toBe("s4");
    expect(res.matched_on).toBe("fuzzy");
    expect(res.confidence).toBeGreaterThan(0.8);
    expect(res.confidence).toBeLessThan(1);
  });

  it("returns no match if fuzzy similarity below threshold", () => {
    const res = stitchCandidate(
      { candidate_oem_serial_number: "ABCDE", candidate_asset_tag: null },
      [scope({ id: "s5", oem_serial_number: "ZZZZZ" })],
    );
    expect(res.scope_id).toBeNull();
    expect(res.matched_on).toBe("none");
  });

  it("returns no match on empty candidate", () => {
    const res = stitchCandidate(
      { candidate_oem_serial_number: null, candidate_asset_tag: null },
      [scope({ id: "s6", oem_serial_number: "ABC" })],
    );
    expect(res.scope_id).toBeNull();
  });

  it("prefers exact serial over exact asset tag", () => {
    const res = stitchCandidate(
      { candidate_oem_serial_number: "AAA", candidate_asset_tag: "BBB" },
      [
        scope({ id: "a", oem_serial_number: "AAA" }),
        scope({ id: "b", asset_tag: "BBB" }),
      ],
    );
    expect(res.scope_id).toBe("a");
    expect(res.matched_on).toBe("oem_serial_number");
  });
});
