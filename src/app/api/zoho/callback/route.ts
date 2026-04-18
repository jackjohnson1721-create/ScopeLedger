/**
 * GET /api/zoho/callback
 *
 * Zoho OAuth redirects back with `code` + `state`. Verify the state
 * HMAC, exchange the code for tokens, and persist to `zoho_connection`.
 * On success, redirect to /admin with a notice; on failure, 400.
 */

import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { supabaseService } from "@/lib/supabase/service";
import { exchangeCode, type ZohoDc } from "@/lib/zoho/oauth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) {
    return NextResponse.json({ error: "missing_code_or_state" }, { status: 400 });
  }

  const stateSecret = process.env.ZOHO_STATE_SECRET;
  const clientId = process.env.ZOHO_CLIENT_ID;
  const clientSecret = process.env.ZOHO_CLIENT_SECRET;
  if (!stateSecret || !clientId || !clientSecret) {
    return NextResponse.json({ error: "misconfigured" }, { status: 500 });
  }

  const verified = verifyState(state, stateSecret);
  if (!verified) return NextResponse.json({ error: "invalid_state" }, { status: 400 });

  const { org_id, user_id, product, dc, ts } = verified;
  if (Date.now() - ts > 10 * 60 * 1000) {
    return NextResponse.json({ error: "state_expired" }, { status: 400 });
  }

  const redirectUri = `${url.origin}/api/zoho/callback`;
  const token = await exchangeCode({
    dc: dc as ZohoDc,
    clientId,
    clientSecret,
    redirectUri,
    code,
  });

  if (!token.refresh_token) {
    return NextResponse.json({ error: "no_refresh_token" }, { status: 400 });
  }

  const service = supabaseService();
  await service.from("zoho_connection").upsert(
    {
      org_id,
      product,
      dc,
      api_domain: token.api_domain,
      refresh_token: token.refresh_token,
      access_token: token.access_token,
      access_token_expires_at: new Date(Date.now() + token.expires_in * 1000).toISOString(),
      scope: product,
      connected_by: user_id,
    },
    { onConflict: "org_id,product" },
  );

  return NextResponse.redirect(`${url.origin}/admin?zoho=connected&product=${product}`);
}

interface StatePayload {
  org_id: string;
  user_id: string;
  product: string;
  dc: string;
  nonce: string;
  ts: number;
}

function verifyState(state: string, secret: string): StatePayload | null {
  const [body, mac] = state.split(".");
  if (!body || !mac) return null;
  const expected = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  if (!crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as StatePayload;
  } catch {
    return null;
  }
}
