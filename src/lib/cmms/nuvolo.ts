import type { CmmsAdapter } from "./types";
import { CmmsNotConfiguredError } from "./types";

/**
 * Nuvolo adapter stub (ServiceNow-based CMMS). Real integration
 * uses a Nuvolo-issued OAuth app and the REST API. Awaiting
 * customer enablement.
 */
export function nuvoloAdapter(): CmmsAdapter {
  return {
    vendor: "nuvolo",
    async listScopes() {
      throw new CmmsNotConfiguredError("nuvolo");
    },
  };
}
