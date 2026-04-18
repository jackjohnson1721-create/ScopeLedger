import { describe, expect, it } from "vitest";
import { computeThreshold } from "./threshold";

describe("computeThreshold", () => {
  const defaults = { yellowPct: 0.45, redPct: 0.6 };

  it("returns insufficient_data when replacement cost is missing", () => {
    expect(
      computeThreshold({ ...defaults, rolling12MoSpendCents: 100_000, replacementCostCents: null }),
    ).toEqual({ ratio: null, flag: "insufficient_data" });
  });

  it("returns insufficient_data when replacement cost is zero", () => {
    expect(
      computeThreshold({ ...defaults, rolling12MoSpendCents: 100_000, replacementCostCents: 0 }),
    ).toEqual({ ratio: null, flag: "insufficient_data" });
  });

  it("fires green under the yellow threshold", () => {
    const { flag } = computeThreshold({
      ...defaults,
      rolling12MoSpendCents: 40_00 * 100,
      replacementCostCents: 100_00 * 100,
    });
    expect(flag).toBe("green");
  });

  it("fires yellow at exactly the yellow threshold", () => {
    const { flag, ratio } = computeThreshold({
      ...defaults,
      rolling12MoSpendCents: 45_00 * 100,
      replacementCostCents: 100_00 * 100,
    });
    expect(flag).toBe("yellow");
    expect(ratio).toBeCloseTo(0.45);
  });

  it("fires red at exactly the red threshold", () => {
    const { flag } = computeThreshold({
      ...defaults,
      rolling12MoSpendCents: 60_00 * 100,
      replacementCostCents: 100_00 * 100,
    });
    expect(flag).toBe("red");
  });

  it("fires red above the red threshold", () => {
    const { flag } = computeThreshold({
      ...defaults,
      rolling12MoSpendCents: 90_00 * 100,
      replacementCostCents: 100_00 * 100,
    });
    expect(flag).toBe("red");
  });

  it("respects custom organization thresholds", () => {
    const { flag } = computeThreshold({
      yellowPct: 0.3,
      redPct: 0.5,
      rolling12MoSpendCents: 35_00 * 100,
      replacementCostCents: 100_00 * 100,
    });
    expect(flag).toBe("yellow");
  });
});
