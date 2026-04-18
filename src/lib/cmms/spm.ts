import type { CmmsAdapter } from "./types";
import { CmmsNotConfiguredError } from "./types";

/**
 * SPM (Microsystems) adapter stub. Real integration requires an
 * OEM-supplied export feed or ODBC connection; scaffolded here so
 * the importer knows about it.
 */
export function spmAdapter(): CmmsAdapter {
  return {
    vendor: "spm",
    async listScopes() {
      throw new CmmsNotConfiguredError("spm");
    },
  };
}
