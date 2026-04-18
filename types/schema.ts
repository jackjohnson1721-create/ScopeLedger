/**
 * Auto-generated from artifacts/schema.json v1.0.0-draft.
 * Do not edit by hand — update the JSON schema and regenerate.
 * Regeneration script: scripts/generate-types.ts (Phase 1 TODO).
 */

export type UUID = string & { readonly __uuid: unique symbol };
export type ISODateTime = string & { readonly __isoDateTime: unique symbol };
export type ISODate = string & { readonly __isoDate: unique symbol };

// Enums ---------------------------------------------------------------------

export type PlanTier = "free" | "pro_light" | "pro_standard" | "enterprise";

export type MemberRole =
  | "spd_manager"
  | "biomed"
  | "cfo_readonly"
  | "admin"
  | "platform_super_admin";

export type MemberStatus = "invited" | "active" | "disabled";

export type IdentityKeyPolicy =
  | "oem_serial_number"
  | "asset_tag"
  | "internal_id"
  | "composite";

export type ScopeOem =
  | "stryker"
  | "olympus"
  | "karl_storz"
  | "richard_wolf"
  | "smith_nephew"
  | "conmed"
  | "other";

export type ScopeType =
  | "rigid_arthroscope"
  | "rigid_laparoscope"
  | "rigid_cystoscope"
  | "rigid_hysteroscope"
  | "rigid_sinuscope"
  | "other";

export type ScopeStatus = "active" | "retired" | "replaced" | "loaner_pool";

export type FailureCausation = "wear" | "handling" | "contamination" | "unknown";

export type RepairSource =
  | "spd_forward"
  | "contracts_mailbox"
  | "oem_portal"
  | "manual_entry"
  | "zoho_books"
  | "censitrac"
  | "spm"
  | "nuvolo";

export type HitlStatus = "not_required" | "pending" | "resolved";

export type ThresholdFlag = "green" | "yellow" | "red" | "insufficient_data";

export type VendorCategory = "oem_direct" | "iso_third_party" | "internal_biomed" | "unknown";

export type IngestSource =
  | "postmark_inbound"
  | "web_upload"
  | "zoho_books_webhook"
  | "zoho_crm_webhook"
  | "manual_entry";

export type OcrProvider = "aws_textract" | "azure_document_intelligence" | "none";

export type ChannelKind = "native_pdf" | "scanned_pdf" | "photo" | "email_body";

export type IngestStatus =
  | "received"
  | "ocr_ok"
  | "classified"
  | "extracted"
  | "hitl_pending"
  | "persisted"
  | "failed";

export type CapitalRequestStatus = "draft" | "clinical_review" | "final" | "rescinded";

export type BillingStatus = "trial" | "active" | "past_due" | "canceled" | "paused";

// Entities ------------------------------------------------------------------

export interface Organization {
  id: UUID;
  name: string;
  slug: string;
  plan: PlanTier;
  identity_key_policy: IdentityKeyPolicy;
  threshold_yellow_pct: number;
  threshold_red_pct: number;
  zoho_crm_account_id: string | null;
  zoho_books_customer_id: string | null;
  zoho_subscription_id: string | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface Membership {
  id: UUID;
  user_id: UUID;
  org_id: UUID;
  role: MemberRole;
  status: MemberStatus;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface ScopeIdentity {
  id: UUID;
  org_id: UUID;
  oem_serial_number: string | null;
  asset_tag: string | null;
  internal_id: string | null;
  oem: ScopeOem;
  model_name: string | null;
  scope_type: ScopeType | null;
  acquisition_date: ISODate | null;
  acquisition_cost_cents: number | null;
  replacement_cost_cents: number | null;
  status: ScopeStatus;
  retirement_date: ISODate | null;
  notes: string | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface FailureMode {
  id: UUID;
  code: string;
  label: string;
  description: string | null;
  causation: FailureCausation;
  distal_tip: boolean;
}

export interface RepairEvent {
  id: UUID;
  org_id: UUID;
  scope_id: UUID;
  vendor_id: UUID | null;
  service_date: ISODate;
  completion_date: ISODate | null;
  failure_mode_code: string | null;
  description: string | null;
  cost_cents: number;
  currency: string;
  loaner_days: number | null;
  loaner_attributable: boolean;
  stitching_confidence: number | null;
  extraction_confidence: number | null;
  source: RepairSource;
  ingestion_audit_id: UUID | null;
  hitl_status: HitlStatus;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface DerivedMetrics {
  scope_id: UUID;
  org_id: UUID;
  rolling_12mo_spend_cents: number;
  lifetime_spend_cents: number;
  rolling_12mo_repair_count: number;
  distal_tip_12mo_count: number;
  wear_mode_spend_cents: number;
  handling_mode_spend_cents: number;
  threshold_ratio: number | null;
  threshold_flag: ThresholdFlag;
  handling_audit_flag: boolean;
  avoided_replacement_estimate: number;
  loaner_days_attributable_12mo: number;
  computed_at: ISODateTime;
}

export interface VendorMetadata {
  id: UUID;
  org_id: UUID;
  name: string;
  canonical_key: string;
  category: VendorCategory;
  classification_confidence: number | null;
  created_at: ISODateTime;
}

export interface IngestionAudit {
  id: UUID;
  org_id: UUID;
  source: IngestSource;
  idempotency_key: string;
  storage_path: string | null;
  received_at: ISODateTime;
  ocr_provider: OcrProvider | null;
  ocr_confidence: number | null;
  classification_confidence: number | null;
  extraction_confidence: number | null;
  channel_kind: ChannelKind | null;
  status: IngestStatus;
  error: string | null;
}

export interface CapitalRequest {
  id: UUID;
  org_id: UUID;
  scope_id: UUID;
  status: CapitalRequestStatus;
  coverage_pct: number | null;
  min_field_confidence: number | null;
  dual_signer_required: boolean;
  clinical_reviewed_at: ISODateTime | null;
  clinical_reviewed_by: UUID | null;
  finalized_at: ISODateTime | null;
  pdf_storage_path: string | null;
  pdf_sha256: string | null;
  zoho_books_invoice_id: string | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface Billing {
  org_id: UUID;
  zoho_subscription_id: string;
  zoho_customer_id: string | null;
  plan: Exclude<PlanTier, "free">;
  status: BillingStatus;
  channel_mix_native_pdf_pct: number | null;
  channel_mix_gate_met: boolean | null;
  next_renewal_at: ISODateTime | null;
  synced_at: ISODateTime;
}

// Database shape (used by @supabase/supabase-js generics) ------------------

export interface Database {
  public: {
    Tables: {
      organizations: TableShape<Organization>;
      memberships: TableShape<Membership>;
      scope_identity: TableShape<ScopeIdentity>;
      failure_mode_taxonomy: TableShape<FailureMode>;
      vendor_metadata: TableShape<VendorMetadata>;
      ingestion_audit: TableShape<IngestionAudit>;
      repair_event: TableShape<RepairEvent>;
      derived_metrics: TableShape<DerivedMetrics>;
      capital_request: TableShape<CapitalRequest>;
      billing: TableShape<Billing>;
    };
  };
}

type TableShape<T> = {
  Row: T;
  Insert: Partial<T>;
  Update: Partial<T>;
};
