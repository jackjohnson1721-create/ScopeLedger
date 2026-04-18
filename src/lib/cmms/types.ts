/**
 * CMMS adapter interface.
 *
 * ScopeLedger integrates with hospital CMMS systems to import the
 * authoritative scope inventory. Phase 5 ships with stubs for the
 * three common ones (Censitrac, SPM, Nuvolo); real adapter
 * implementations are gated on (a) customer signing a BAA and (b)
 * the CMMS vendor providing API access.
 */

export interface CmmsScope {
  external_id: string;
  oem_serial_number: string | null;
  asset_tag: string | null;
  internal_id: string | null;
  oem: string | null;
  model_name: string | null;
  scope_type: string | null;
  acquisition_date: string | null;
  acquisition_cost_cents: number | null;
  replacement_cost_cents: number | null;
  status: "active" | "retired" | "replaced" | "loaner_pool" | "unknown";
}

export interface CmmsAdapter {
  readonly vendor: "censitrac" | "spm" | "nuvolo";
  /**
   * Paginated fetch. Callers loop until the returned `next_cursor`
   * is null. The adapter is responsible for retry + rate-limiting.
   */
  listScopes(args: { orgId: string; cursor?: string | null }): Promise<{
    scopes: CmmsScope[];
    next_cursor: string | null;
  }>;
}

export class CmmsNotConfiguredError extends Error {
  constructor(public vendor: string) {
    super(`cmms_not_configured:${vendor}`);
  }
}
