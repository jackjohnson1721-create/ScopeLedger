/**
 * Pure HTML template for capital-request PDFs.
 *
 * The final CFO-facing visual design is gated on human approval
 * (design-agent + stakeholder review). This template renders the
 * 8 required sections in a plain semantic HTML form so the data is
 * present and testable; the stylesheet is placeholder-minimal and
 * will be replaced in the Phase-4 design review.
 */

export interface CapitalRequestData {
  org: {
    name: string;
    slug: string;
  };
  scope: {
    oem: string;
    model_name: string | null;
    oem_serial_number: string | null;
    asset_tag: string | null;
    acquisition_date: string | null;
    acquisition_cost_cents: number | null;
    replacement_cost_cents: number | null;
  };
  metrics: {
    rolling_12mo_spend_cents: number;
    lifetime_spend_cents: number;
    rolling_12mo_repair_count: number;
    threshold_ratio: number | null;
    threshold_flag: "green" | "yellow" | "red" | "insufficient_data";
    distal_tip_12mo_count: number;
    wear_mode_spend_cents: number;
    handling_mode_spend_cents: number;
    handling_audit_flag: boolean;
    avoided_replacement_estimate: number;
    loaner_days_attributable_12mo: number;
  };
  repairs: Array<{
    service_date: string;
    vendor_name: string | null;
    failure_mode_label: string | null;
    cost_cents: number;
    currency: string;
  }>;
  approval: {
    generated_at: string;
    min_field_confidence: number | null;
    coverage_pct: number | null;
    dual_signer_required: boolean;
    clinical_reviewed_at: string | null;
    clinical_reviewed_by: string | null;
    finalized_at: string | null;
  };
}

export function renderCapitalRequestHtml(data: CapitalRequestData): string {
  const fmt = (cents: number | null | undefined) =>
    cents === null || cents === undefined
      ? "—"
      : (cents / 100).toLocaleString("en-US", {
          style: "currency",
          currency: "USD",
        });
  const pct = (r: number | null) =>
    r === null ? "—" : `${(r * 100).toFixed(1)}%`;

  const repairRows = data.repairs
    .map(
      (r) =>
        `<tr><td>${esc(r.service_date)}</td><td>${esc(r.vendor_name ?? "—")}</td><td>${esc(
          r.failure_mode_label ?? "—",
        )}</td><td class="num">${fmt(r.cost_cents)}</td></tr>`,
    )
    .join("");

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/>
<title>Capital Request — ${esc(data.scope.oem_serial_number ?? data.scope.asset_tag ?? "scope")}</title>
<style>
  body { font-family: -apple-system, system-ui, sans-serif; color:#111; margin:48px; }
  h1 { font-size: 22px; margin-bottom: 4px; }
  h2 { font-size: 14px; text-transform: uppercase; letter-spacing:.05em; color:#555;
       border-bottom:1px solid #ddd; padding-bottom:4px; margin-top:24px; }
  table { width:100%; border-collapse: collapse; margin-top:8px; font-size: 12px; }
  th, td { border-bottom:1px solid #eee; padding:6px 8px; text-align:left; }
  td.num { text-align:right; font-variant-numeric: tabular-nums; }
  .flag { display:inline-block; padding:2px 8px; border-radius:4px; font-size:12px; }
  .flag.green { background:#d4edda; }
  .flag.yellow { background:#fff3cd; }
  .flag.red { background:#f8d7da; }
  .flag.insufficient_data { background:#e2e3e5; }
  .kv { display:grid; grid-template-columns: 240px 1fr; row-gap:4px; font-size:12px; }
  .sig-block { margin-top: 36px; border-top: 2px solid #111; padding-top:12px; font-size:12px; }
</style></head>
<body>

<h1>Capital Request — ${esc(data.org.name)}</h1>
<div style="font-size:12px;color:#555;">
  Generated ${esc(data.approval.generated_at)} · ScopeLedger draft
</div>

<h2>1. Executive summary</h2>
<div class="kv">
  <div>Threshold flag</div>
  <div><span class="flag ${esc(data.metrics.threshold_flag)}">${esc(data.metrics.threshold_flag)}</span> ${pct(data.metrics.threshold_ratio)}</div>
  <div>Rolling 12-mo repair spend</div><div>${fmt(data.metrics.rolling_12mo_spend_cents)}</div>
  <div>Replacement cost</div><div>${fmt(data.scope.replacement_cost_cents)}</div>
  <div>Avoided-replacement estimate</div><div>$${data.metrics.avoided_replacement_estimate.toFixed(2)}</div>
</div>

<h2>2. Scope identity</h2>
<div class="kv">
  <div>OEM</div><div>${esc(data.scope.oem)}</div>
  <div>Model</div><div>${esc(data.scope.model_name ?? "—")}</div>
  <div>OEM serial number</div><div>${esc(data.scope.oem_serial_number ?? "—")}</div>
  <div>Asset tag</div><div>${esc(data.scope.asset_tag ?? "—")}</div>
  <div>Acquisition date</div><div>${esc(data.scope.acquisition_date ?? "—")}</div>
  <div>Acquisition cost</div><div>${fmt(data.scope.acquisition_cost_cents)}</div>
</div>

<h2>3. 12-month repair history</h2>
<table>
  <thead><tr><th>Service date</th><th>Vendor</th><th>Failure mode</th><th class="num">Cost</th></tr></thead>
  <tbody>${repairRows || `<tr><td colspan="4">No repairs in window.</td></tr>`}</tbody>
</table>

<h2>4. Threshold analysis</h2>
<div class="kv">
  <div>Ratio (12-mo spend / replacement)</div><div>${pct(data.metrics.threshold_ratio)}</div>
  <div>Repair count (12-mo)</div><div>${data.metrics.rolling_12mo_repair_count}</div>
  <div>Lifetime spend</div><div>${fmt(data.metrics.lifetime_spend_cents)}</div>
</div>

<h2>5. Handling audit</h2>
<div class="kv">
  <div>Distal-tip events (12-mo)</div><div>${data.metrics.distal_tip_12mo_count}</div>
  <div>Handling-mode spend (lifetime)</div><div>${fmt(data.metrics.handling_mode_spend_cents)}</div>
  <div>Wear-mode spend (lifetime)</div><div>${fmt(data.metrics.wear_mode_spend_cents)}</div>
  <div>Audit flagged?</div><div>${data.metrics.handling_audit_flag ? "YES — review handling procedures" : "No"}</div>
</div>

<h2>6. Avoided-replacement estimate</h2>
<p style="font-size:12px;">
  Estimate based on (replacement cost − 12-mo repair spend). Reported for CFO
  context only; not a formal actuarial projection.
</p>
<div class="kv">
  <div>Estimate</div><div>$${data.metrics.avoided_replacement_estimate.toFixed(2)}</div>
</div>

<h2>7. Loaner attribution</h2>
<div class="kv">
  <div>Loaner days attributable (12-mo)</div><div>${data.metrics.loaner_days_attributable_12mo}</div>
</div>

<h2>8. Approvals</h2>
<div class="kv">
  <div>Data-quality min field confidence</div>
  <div>${data.approval.min_field_confidence === null ? "—" : (data.approval.min_field_confidence * 100).toFixed(1) + "%"}</div>
  <div>Source coverage</div>
  <div>${data.approval.coverage_pct === null ? "—" : (data.approval.coverage_pct * 100).toFixed(1) + "%"}</div>
  <div>Dual-signer required?</div><div>${data.approval.dual_signer_required ? "YES" : "No"}</div>
  <div>Clinical review</div>
  <div>${data.approval.clinical_reviewed_at ? esc(data.approval.clinical_reviewed_at) + " by " + esc(data.approval.clinical_reviewed_by ?? "—") : "Pending"}</div>
  <div>Finalized</div><div>${data.approval.finalized_at ? esc(data.approval.finalized_at) : "Draft"}</div>
</div>

<div class="sig-block">
  <div>SPD Manager sign-off ______________________________  Date __________</div>
  ${data.approval.dual_signer_required ? `<div style="margin-top:18px;">CFO / Finance sign-off ____________________________  Date __________</div>` : ""}
</div>

</body></html>`;
}

function esc(s: string | null | undefined): string {
  if (s === null || s === undefined) return "";
  return String(s).replace(/[&<>"']/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === '"' ? "&quot;" : "&#39;",
  );
}
