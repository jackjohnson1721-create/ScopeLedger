import type { CmmsAdapter } from "./types";
import { CmmsNotConfiguredError } from "./types";

/**
 * Censitrac (STERIS) adapter stub. Real integration requires the
 * hospital's Censitrac API credentials + whitelist; ScopeLedger does
 * NOT attempt to scrape the UI. Until credentials are on file, every
 * call throws CmmsNotConfiguredError and the importer falls back to
 * CSV.
 */
export function censitracAdapter(): CmmsAdapter {
  return {
    vendor: "censitrac",
    async listScopes() {
      throw new CmmsNotConfiguredError("censitrac");
    },
  };
}
