/**
 * GET /api/capital-request/[id]/pdf
 *
 * Renders the capital-request PDF on demand. The first final render is
 * written to Storage and its sha256 stamped on the row; subsequent reads
 * can stream from Storage. Draft requests are re-rendered on each call.
 */

import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";
import { renderCapitalRequestHtml, type CapitalRequestData } from "@/lib/capital-request/html";
import { renderPdf } from "@/lib/capital-request/render";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: cr } = await supabase
    .from("capital_request")
    .select(
      "id, org_id, scope_id, status, dual_signer_required, coverage_pct, min_field_confidence, clinical_reviewed_at, clinical_reviewed_by, finalized_at",
    )
    .eq("id", id)
    .maybeSingle();
  if (!cr) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const service = supabaseService();

  const [{ data: org }, { data: scope }, { data: metrics }, { data: repairs }] = await Promise.all([
    service.from("organizations").select("name, slug").eq("id", cr.org_id).single(),
    service
      .from("scope_identity")
      .select(
        "oem, model_name, oem_serial_number, asset_tag, acquisition_date, acquisition_cost_cents, replacement_cost_cents",
      )
      .eq("id", cr.scope_id)
      .single(),
    service.from("derived_metrics").select("*").eq("scope_id", cr.scope_id).maybeSingle(),
    service
      .from("repair_event")
      .select("service_date, cost_cents, currency, vendor_id, failure_mode_code")
      .eq("scope_id", cr.scope_id)
      .gte("service_date", new Date(Date.now() - 365 * 86400_000).toISOString().slice(0, 10))
      .order("service_date", { ascending: false }),
  ]);

  if (!org || !scope) return NextResponse.json({ error: "data_missing" }, { status: 404 });

  const vendorIds = Array.from(new Set((repairs ?? []).map((r) => r.vendor_id).filter(Boolean)));
  const failureCodes = Array.from(
    new Set((repairs ?? []).map((r) => r.failure_mode_code).filter(Boolean)),
  );

  const [{ data: vendors }, { data: failures }] = await Promise.all([
    vendorIds.length
      ? service.from("vendor_metadata").select("id, name").in("id", vendorIds as string[])
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    failureCodes.length
      ? service
          .from("failure_mode_taxonomy")
          .select("code, label")
          .in("code", failureCodes as string[])
      : Promise.resolve({ data: [] as { code: string; label: string }[] }),
  ]);

  const vendorMap = new Map((vendors ?? []).map((v) => [v.id, v.name]));
  const failureMap = new Map((failures ?? []).map((f) => [f.code, f.label]));

  const data: CapitalRequestData = {
    org: { name: org.name, slug: org.slug },
    scope: {
      oem: scope.oem,
      model_name: scope.model_name,
      oem_serial_number: scope.oem_serial_number,
      asset_tag: scope.asset_tag,
      acquisition_date: scope.acquisition_date,
      acquisition_cost_cents: scope.acquisition_cost_cents,
      replacement_cost_cents: scope.replacement_cost_cents,
    },
    metrics: {
      rolling_12mo_spend_cents: metrics?.rolling_12mo_spend_cents ?? 0,
      lifetime_spend_cents: metrics?.lifetime_spend_cents ?? 0,
      rolling_12mo_repair_count: metrics?.rolling_12mo_repair_count ?? 0,
      threshold_ratio: metrics?.threshold_ratio ?? null,
      threshold_flag: (metrics?.threshold_flag ?? "insufficient_data") as CapitalRequestData["metrics"]["threshold_flag"],
      distal_tip_12mo_count: metrics?.distal_tip_12mo_count ?? 0,
      wear_mode_spend_cents: metrics?.wear_mode_spend_cents ?? 0,
      handling_mode_spend_cents: metrics?.handling_mode_spend_cents ?? 0,
      handling_audit_flag: !!metrics?.handling_audit_flag,
      avoided_replacement_estimate: Number(metrics?.avoided_replacement_estimate ?? 0),
      loaner_days_attributable_12mo: metrics?.loaner_days_attributable_12mo ?? 0,
    },
    repairs: (repairs ?? []).map((r) => ({
      service_date: r.service_date,
      vendor_name: r.vendor_id ? vendorMap.get(r.vendor_id) ?? null : null,
      failure_mode_label: r.failure_mode_code ? failureMap.get(r.failure_mode_code) ?? null : null,
      cost_cents: r.cost_cents,
      currency: r.currency,
    })),
    approval: {
      generated_at: new Date().toISOString(),
      min_field_confidence: cr.min_field_confidence,
      coverage_pct: cr.coverage_pct,
      dual_signer_required: cr.dual_signer_required,
      clinical_reviewed_at: cr.clinical_reviewed_at,
      clinical_reviewed_by: cr.clinical_reviewed_by,
      finalized_at: cr.finalized_at,
    },
  };

  const html = renderCapitalRequestHtml(data);

  let pdf: Uint8Array;
  try {
    pdf = await renderPdf(html);
  } catch (err) {
    return NextResponse.json(
      { error: "pdf_render_failed", message: (err as Error).message },
      { status: 500 },
    );
  }

  if (cr.status === "final") {
    const sha = crypto.createHash("sha256").update(pdf).digest("hex");
    const path = `capital-request/${cr.org_id}/${cr.id}.pdf`;
    await service.storage.from("artifacts").upload(path, pdf, {
      contentType: "application/pdf",
      upsert: true,
    });
    await service
      .from("capital_request")
      .update({ pdf_storage_path: path, pdf_sha256: sha })
      .eq("id", cr.id);
  }

  return new NextResponse(pdf as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="capital-request-${cr.id}.pdf"`,
    },
  });
}
