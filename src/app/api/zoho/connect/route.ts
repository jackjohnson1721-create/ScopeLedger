/**
 * GET /api/zoho/connect?product=subscriptions|books|crm&dc=com
 *
 * Kicks off the Zoho OAuth flow. A short-lived signed `state` token
 * carries the org_id, user_id, product, and dc so the /callback route
 * can authenticate the returning request without a DB round-trip.
 */

import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { supabaseServer } from "@/lib/supabase/server";
import { authorizeUrl, type ZohoDc } from "@/lib/zoho/oauth";

const SCOPES: Record<string, string> = {
  subscriptions:
    "ZohoSubscriptions.subscriptions.READ,ZohoSubscriptions.customers.READ,ZohoSubscriptions.invoices.READ",
  books:
    "ZohoBooks.invoices.READ,ZohoBooks.invoices.CREATE,ZohoBooks.customers.READ,ZohoBooks.customers.CREATE",
  crm: "ZohoCRM.modules.accounts.READ,ZohoCRM.modules.accounts.WRITE",
};

export async function GET(request: Request) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const product = url.searchParams.get("product") ?? "subscriptions";
  const dc = (url.searchParams.get("dc") ?? "com") as ZohoDc;

  const scope = SCOPES[product];
  if (!scope) return NextResponse.json({ error: "unknown_product" }, { status: 400 });

  const { data: membership } = await supabase
    .from("memberships")
    .select("org_id, role")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();
  if (!membership) return NextResponse.json({ error: "no_org" }, { status: 403 });
  if (!["admin", "platform_super_admin"].includes(membership.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const clientId = process.env.ZOHO_CLIENT_ID;
  const stateSecret = process.env.ZOHO_STATE_SECRET;
  if (!clientId || !stateSecret) {
    return NextResponse.json({ error: "misconfigured" }, { status: 500 });
  }

  const payload = {
    org_id: membership.org_id,
    user_id: user.id,
    product,
    dc,
    nonce: crypto.randomBytes(12).toString("hex"),
    ts: Date.now(),
  };
  const state = signState(payload, stateSecret);

  const redirectUri = `${url.origin}/api/zoho/callback`;
  const authorize = authorizeUrl({ dc, clientId, redirectUri, scope, state });
  return NextResponse.redirect(authorize);
}

function signState(payload: Record<string, unknown>, secret: string): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const mac = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${mac}`;
}
