import { describe, expect, it } from "vitest";
import { renderCapitalRequestHtml, type CapitalRequestData } from "./html";

function fixture(over: Partial<CapitalRequestData> = {}): CapitalRequestData {
  return {
    org: { name: "Memorial General", slug: "memorial", ...over.org },
    scope: {
      oem: "stryker",
      model_name: "1588 AIM",
      oem_serial_number: "SN-42",
      asset_tag: "BIO-01",
      acquisition_date: "2021-06-01",
      acquisition_cost_cents: 2_500_000,
      replacement_cost_cents: 3_000_000,
      ...over.scope,
    },
    metrics: {
      rolling_12mo_spend_cents: 1_800_000,
      lifetime_spend_cents: 3_400_000,
      rolling_12mo_repair_count: 4,
      threshold_ratio: 0.6,
      threshold_flag: "red",
      distal_tip_12mo_count: 2,
      wear_mode_spend_cents: 1_200_000,
      handling_mode_spend_cents: 2_200_000,
      handling_audit_flag: true,
      avoided_replacement_estimate: 12000,
      loaner_days_attributable_12mo: 30,
      ...over.metrics,
    },
    repairs: over.repairs ?? [
      {
        service_date: "2025-01-12",
        vendor_name: "Stryker Service",
        failure_mode_label: "Distal tip bent",
        cost_cents: 480000,
        currency: "USD",
      },
    ],
    approval: {
      generated_at: "2025-04-15T14:00:00Z",
      min_field_confidence: 0.88,
      coverage_pct: 0.91,
      dual_signer_required: true,
      clinical_reviewed_at: null,
      clinical_reviewed_by: null,
      finalized_at: null,
      ...over.approval,
    },
  };
}

describe("renderCapitalRequestHtml", () => {
  it("renders all 8 section headings", () => {
    const html = renderCapitalRequestHtml(fixture());
    for (const h of [
      "Executive summary",
      "Scope identity",
      "12-month repair history",
      "Threshold analysis",
      "Handling audit",
      "Avoided-replacement estimate",
      "Loaner attribution",
      "Approvals",
    ]) {
      expect(html).toContain(h);
    }
  });

  it("shows the red flag class when threshold is red", () => {
    const html = renderCapitalRequestHtml(fixture());
    expect(html).toMatch(/class="flag red"/);
  });

  it("shows dual-signer block when required", () => {
    const html = renderCapitalRequestHtml(fixture());
    expect(html).toContain("CFO / Finance sign-off");
  });

  it("hides dual-signer block when not required", () => {
    const html = renderCapitalRequestHtml(
      fixture({ approval: { ...fixture().approval, dual_signer_required: false } }),
    );
    expect(html).not.toContain("CFO / Finance sign-off");
  });

  it("escapes user-supplied text", () => {
    const html = renderCapitalRequestHtml(
      fixture({ org: { name: "<script>", slug: "x" } }),
    );
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
  });

  it("renders empty repairs row when none", () => {
    const html = renderCapitalRequestHtml(fixture({ repairs: [] }));
    expect(html).toContain("No repairs in window");
  });
});
