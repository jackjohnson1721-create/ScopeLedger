/**
 * Zoho Books API client.
 *
 * The Books integration serves two purposes:
 *   1. Inbound: when a Books invoice is created that matches a scope
 *      in our registry, we can cross-reference it.
 *   2. Outbound: when a capital-request is finalized we can optionally
 *      push a line-item to Books for CFO approval. (Off by default.)
 */

import { refreshAccessToken, type ZohoDc } from "./oauth";

export interface BooksClientOptions {
  dc: ZohoDc;
  organizationId: string;
  apiDomain: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  accessToken: string | null;
  accessTokenExpiresAt: Date | null;
}

export function booksClient(initial: BooksClientOptions) {
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
    const url = new URL(`${state.apiDomain}/books/v3${path}`);
    url.searchParams.set("organization_id", state.organizationId);
    const res = await fetch(url, {
      ...init,
      headers: {
        ...(init?.headers ?? {}),
        Authorization: `Zoho-oauthtoken ${accessToken}`,
      },
    });
    if (!res.ok) {
      throw new Error(`zoho_books_${res.status}: ${await res.text()}`);
    }
    return (await res.json()) as T;
  }

  return {
    getInvoice(invoiceId: string) {
      return req<{ invoice: BooksInvoice }>(`/invoices/${invoiceId}`);
    },
    listInvoices(params?: { customer_id?: string; date_start?: string; date_end?: string }) {
      const q = new URLSearchParams();
      if (params?.customer_id) q.set("customer_id", params.customer_id);
      if (params?.date_start) q.set("date_start", params.date_start);
      if (params?.date_end) q.set("date_end", params.date_end);
      const qs = q.toString() ? `&${q.toString()}` : "";
      return req<{ invoices: BooksInvoice[] }>(`/invoices?${qs}`);
    },
    createInvoice(invoice: Partial<BooksInvoice>) {
      return req<{ invoice: BooksInvoice }>(`/invoices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invoice),
      });
    },
  };
}

export interface BooksInvoice {
  invoice_id: string;
  customer_id: string;
  invoice_number: string;
  status: string;
  date: string;
  total: number;
  currency_code: string;
  line_items: Array<{
    line_item_id?: string;
    name: string;
    description?: string;
    quantity: number;
    rate: number;
  }>;
}
