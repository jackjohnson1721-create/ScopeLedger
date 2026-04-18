/**
 * Zoho OAuth 2.0 — three-legged auth for Subscriptions + Books + CRM.
 *
 * We support the US-DC (.com) and EU-DC (.eu) data centers; the region
 * is captured at org-connect time and stored on `zoho_connection` (added
 * in migration 004). Refresh tokens are long-lived; access tokens are
 * refreshed on demand before each API call.
 */

export type ZohoDc = "com" | "eu" | "in" | "au" | "jp";

const DC_ACCOUNTS: Record<ZohoDc, string> = {
  com: "https://accounts.zoho.com",
  eu: "https://accounts.zoho.eu",
  in: "https://accounts.zoho.in",
  au: "https://accounts.zoho.com.au",
  jp: "https://accounts.zoho.jp",
};

export function authorizeUrl(params: {
  dc: ZohoDc;
  clientId: string;
  redirectUri: string;
  scope: string;
  state: string;
}): string {
  const u = new URL(`${DC_ACCOUNTS[params.dc]}/oauth/v2/auth`);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("client_id", params.clientId);
  u.searchParams.set("scope", params.scope);
  u.searchParams.set("redirect_uri", params.redirectUri);
  u.searchParams.set("access_type", "offline");
  u.searchParams.set("prompt", "consent");
  u.searchParams.set("state", params.state);
  return u.toString();
}

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  api_domain: string;
}

export async function exchangeCode(params: {
  dc: ZohoDc;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  code: string;
}): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: params.clientId,
    client_secret: params.clientSecret,
    redirect_uri: params.redirectUri,
    code: params.code,
  });
  const res = await fetch(`${DC_ACCOUNTS[params.dc]}/oauth/v2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    throw new Error(`zoho_token_exchange_failed_${res.status}`);
  }
  return (await res.json()) as TokenResponse;
}

export async function refreshAccessToken(params: {
  dc: ZohoDc;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: params.refreshToken,
    client_id: params.clientId,
    client_secret: params.clientSecret,
  });
  const res = await fetch(`${DC_ACCOUNTS[params.dc]}/oauth/v2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    throw new Error(`zoho_token_refresh_failed_${res.status}`);
  }
  return (await res.json()) as TokenResponse;
}
