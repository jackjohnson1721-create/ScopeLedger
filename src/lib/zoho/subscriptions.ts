/**
 * Zoho Subscriptions API client.
 *
 * Thin typed wrapper for the endpoints we actually need:
 *   - getSubscription(subscription_id)  (read)
 *   - listInvoices(customer_id)          (for billing sync)
 *
 * Access tokens are refreshed on demand via refreshAccessToken. Callers
 * should fetch the current `zoho_connection` row and hand us the
 * refresh token; we handle the access-token lifecycle.
 */

import { refreshAccessToken, type ZohoDc } from "./oauth";

export interface SubscriptionsClientOptions {
  dc: ZohoDc;
  apiDomain: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  accessToken: string | null;
  accessTokenExpiresAt: Date | null;
}

export function subscriptionsClient(initial: SubscriptionsClientOptions) {
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

  async function get<T>(path: string): Promise<T> {
    const accessToken = await token();
    const res = await fetch(`${state.apiDomain}/subscriptions/v1${path}`, {
      headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
    });
    if (!res.ok) {
      throw new Error(`zoho_subscriptions_${res.status}: ${await res.text()}`);
    }
    return (await res.json()) as T;
  }

  return {
    getSubscription(id: string) {
      return get<{ subscription: ZohoSubscription }>(`/subscriptions/${id}`);
    },
    listInvoices(customerId: string) {
      return get<{ invoices: ZohoInvoice[] }>(
        `/invoices?customer_id=${encodeURIComponent(customerId)}`,
      );
    },
  };
}

export interface ZohoSubscription {
  subscription_id: string;
  customer_id: string;
  status: string;
  plan: { plan_code: string };
  next_billing_at?: string;
}

export interface ZohoInvoice {
  invoice_id: string;
  total: number;
  currency_code: string;
  status: string;
  date: string;
}
