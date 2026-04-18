/**
 * Ingestion orchestrator.
 *
 * Pipeline:
 *   raw artifact (bytes)  →  OCR (Textract primary, Azure fallback)
 *                         →  Page-1 vendor classifier
 *                         →  Generic LLM extractor
 *                         →  HITL gate (any field confidence < 0.85)
 *                         →  Persist candidate repair_events
 *
 * Every stage writes progress to ingestion_audit so we can replay,
 * idempotency is keyed on the provider event id (Postmark MessageID,
 * Zoho event_id, or sha256(bytes) for web uploads).
 */

import { runOcrWithFallback, type OcrProvider } from "@/lib/ocr";
import { classifyVendor } from "@/lib/llm/classifier";
import { extractRepairEvents, type ExtractorResult } from "@/lib/llm/extractor";
import { stitchCandidate, STITCH_AUTO_PROMOTE, type ScopeRow } from "@/lib/metrics/stitching";
import type { SupabaseClient } from "@supabase/supabase-js";

export const HITL_FIELD_CONFIDENCE_THRESHOLD = 0.85;

export interface IngestInput {
  orgId: string;
  source: "postmark_inbound" | "web_upload" | "zoho_books_webhook" | "manual_entry";
  idempotencyKey: string;
  storagePath: string | null;
  channelKind: "native_pdf" | "scanned_pdf" | "photo" | "email_body";
  bytes: Uint8Array;
  mimeType: string;
}

export interface OrchestrateDeps {
  service: SupabaseClient;
  ocrProviders: OcrProvider[];
}

export interface OrchestrateResult {
  ingestion_audit_id: string;
  status: "persisted" | "hitl_pending" | "failed";
  candidate_count: number;
  hitl_flagged: boolean;
}

export async function orchestrateIngest(
  deps: OrchestrateDeps,
  input: IngestInput,
): Promise<OrchestrateResult> {
  const { service } = deps;

  const { data: existing } = await service
    .from("ingestion_audit")
    .select("id, status")
    .eq("org_id", input.orgId)
    .eq("source", input.source)
    .eq("idempotency_key", input.idempotencyKey)
    .maybeSingle();

  if (existing) {
    return {
      ingestion_audit_id: existing.id,
      status: (existing.status as OrchestrateResult["status"]) ?? "persisted",
      candidate_count: 0,
      hitl_flagged: false,
    };
  }

  const { data: audit, error: auditErr } = await service
    .from("ingestion_audit")
    .insert({
      org_id: input.orgId,
      source: input.source,
      idempotency_key: input.idempotencyKey,
      storage_path: input.storagePath,
      channel_kind: input.channelKind,
      status: "received",
    })
    .select("id")
    .single();
  if (auditErr || !audit) {
    throw new Error(`ingest: failed to create audit row: ${auditErr?.message}`);
  }
  const auditId = audit.id;

  try {
    const ocr = await runOcrWithFallback({
      providers: deps.ocrProviders,
      input: { bytes: input.bytes, mimeType: input.mimeType },
      minConfidence: 0.75,
    });
    await service
      .from("ingestion_audit")
      .update({
        status: "ocr_ok",
        ocr_provider: ocr.provider,
        ocr_confidence: ocr.avgConfidence,
      })
      .eq("id", auditId);

    const page1 = ocr.pages[0]?.text ?? "";
    const vendor = await classifyVendor({ ocrPage1Text: page1 });
    await service
      .from("ingestion_audit")
      .update({
        status: "classified",
        classification_confidence: vendor.confidence,
      })
      .eq("id", auditId);

    const fullText = ocr.pages.map((p) => p.text).join("\n\n");
    const extraction: ExtractorResult = await extractRepairEvents({
      ocrText: fullText,
      hintedVendor: vendor.vendor_name,
    });
    await service
      .from("ingestion_audit")
      .update({
        status: "extracted",
        extraction_confidence: extraction.overall_confidence,
      })
      .eq("id", auditId);

    const vendorId = await upsertVendor(
      service,
      input.orgId,
      vendor.vendor_name,
      vendor.category,
      vendor.confidence,
    );

    const scopes = await loadScopes(service, input.orgId);
    const { promoted, pending } = await persistCandidates(service, {
      orgId: input.orgId,
      auditId,
      vendorId,
      extraction,
      scopes,
    });
    const hitlFlagged = pending > 0;

    await service
      .from("ingestion_audit")
      .update({ status: hitlFlagged ? "hitl_pending" : "persisted" })
      .eq("id", auditId);

    return {
      ingestion_audit_id: auditId,
      status: hitlFlagged ? "hitl_pending" : "persisted",
      candidate_count: promoted + pending,
      hitl_flagged: hitlFlagged,
    };
  } catch (err) {
    await service
      .from("ingestion_audit")
      .update({ status: "failed", error: (err as Error).message.slice(0, 500) })
      .eq("id", auditId);
    return {
      ingestion_audit_id: auditId,
      status: "failed",
      candidate_count: 0,
      hitl_flagged: false,
    };
  }
}

async function upsertVendor(
  service: SupabaseClient,
  orgId: string,
  name: string,
  category: "oem_direct" | "iso_third_party" | "internal_biomed" | "unknown",
  confidence: number,
): Promise<string | null> {
  const canonical = name.trim().toLowerCase().replace(/\s+/g, " ");
  const { data } = await service
    .from("vendor_metadata")
    .upsert(
      {
        org_id: orgId,
        name,
        canonical_key: canonical,
        category,
        classification_confidence: confidence,
      },
      { onConflict: "org_id,canonical_key" },
    )
    .select("id")
    .maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

async function loadScopes(service: SupabaseClient, orgId: string): Promise<ScopeRow[]> {
  const { data } = await service
    .from("scope_identity")
    .select("id, oem_serial_number, asset_tag, internal_id")
    .eq("org_id", orgId);
  return (data ?? []) as ScopeRow[];
}

async function persistCandidates(
  service: SupabaseClient,
  params: {
    orgId: string;
    auditId: string;
    vendorId: string | null;
    extraction: ExtractorResult;
    scopes: ScopeRow[];
  },
): Promise<{ promoted: number; pending: number }> {
  let promoted = 0;
  let pending = 0;
  for (const c of params.extraction.candidates) {
    const fieldConfs = Object.values(c.field_confidence ?? {}).filter(
      (v): v is number => typeof v === "number",
    );
    const minFieldConf = fieldConfs.length ? Math.min(...fieldConfs) : 0;

    const stitch = stitchCandidate(
      {
        candidate_oem_serial_number: c.oem_serial_number ?? null,
        candidate_asset_tag: c.asset_tag ?? null,
      },
      params.scopes,
    );

    const autoPromote =
      stitch.scope_id !== null &&
      stitch.confidence >= STITCH_AUTO_PROMOTE &&
      minFieldConf >= HITL_FIELD_CONFIDENCE_THRESHOLD &&
      typeof c.cost_cents === "number" &&
      typeof c.service_date === "string";

    if (autoPromote && stitch.scope_id && c.cost_cents !== null && c.service_date) {
      await service.from("repair_event").insert({
        org_id: params.orgId,
        scope_id: stitch.scope_id,
        vendor_id: params.vendorId,
        service_date: c.service_date,
        completion_date: c.completion_date,
        failure_mode_code: c.failure_mode_code,
        description: c.description,
        cost_cents: c.cost_cents,
        currency: c.currency ?? "USD",
        loaner_days: c.loaner_days,
        loaner_attributable: (c.loaner_days ?? 0) > 0,
        stitching_confidence: stitch.confidence,
        extraction_confidence: minFieldConf,
        source: "contracts_mailbox",
        ingestion_audit_id: params.auditId,
        hitl_status: "not_required",
      });
      promoted++;
      continue;
    }

    await service.from("repair_event_candidates").insert({
      org_id: params.orgId,
      ingestion_audit_id: params.auditId,
      candidate_oem_serial_number: c.oem_serial_number,
      candidate_asset_tag: c.asset_tag,
      service_date: c.service_date,
      completion_date: c.completion_date,
      failure_mode_code: c.failure_mode_code,
      description: c.description,
      cost_cents: c.cost_cents,
      currency: c.currency,
      loaner_days: c.loaner_days,
      extraction_confidence: minFieldConf,
      stitching_confidence: stitch.confidence,
      matched_scope_id: stitch.scope_id,
      source: "contracts_mailbox" as const,
      hitl_status: "pending",
    });
    pending++;
  }
  return { promoted, pending };
}
