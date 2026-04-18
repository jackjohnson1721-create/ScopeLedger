/**
 * Zoho CRM API client.
 *
 * ScopeLedger organizations correspond to CRM Accounts. The integration
 * is primarily one-way (ScopeLedger → CRM): when an org signs up, we
 * create or update the matching Account record with the hospital's
 * plan + health-ticker fields so the sales team sees status.
 */

import { refreshAccessToken, type ZohoDc } from "./oauth";

export interface CrmClientOptions {
  dc: ZohoDc;
  apiDomain: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  accessToken: string | null;
  accessTokenExpiresAt: Date | null;
}

export function crmClient(initial: CrmClientOptions) {
  const state = { ...initial };

  async function token(): Promise<string> {
    const nowMs = Date.now();
    const expiresMs = state.accessTokenExpiresAt?.getTime() ?? 0;
    if (state.accessToken && expiresMs > nowMs + 60_000) {
      return state.accessToken;
    }
    const res = await refreshAccessToken({
      dc: state.dc,
      clientId: state.clientId,
      clientSecret: state.clientSecret,
      refreshToken: state.refreshToken,
    });
    state.accessToken = res.access_token;
    state.accessTokenExpiresAt = new Date(Date.now() + res.expires_in * 1000);
    return res.access_token;
  }

  async function req<T>(path: string, init?: RequestInit): Promise<T> {
    const accessToken = await token();
    const res = await fetch(`${state.apiDomain}/crm/v6${path}`, {
      ...init,
      headers: {
        ...(init?.headers ?? {}),
        Authorization: `Zoho-oauthtoken ${accessToken}`,
      },
    });
    if (!res.ok) {
      throw new Error(`zoho_crm_${res.status}: ${await res.text()}`);
    }
    return (await res.json()) as T;
  }

  return {
    upsertAccount(fields: {
      id?: string;
      Account_Name: string;
      ScopeLedger_Slug?: string;
      ScopeLedger_Plan?: string;
      ScopeLedger_Flagged_Scopes?: number;
      ScopeLedger_12mo_Spend_Cents?: number;
    }) {
      return req<{ data: Array<{ details: { id: string } }> }>(`/Accounts/upsert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: [fields],
          duplicate_check_fields: ["ScopeLedger_Slug"],
        }),
      });
    },
  };
}
