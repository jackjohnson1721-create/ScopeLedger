/**
 * POST /api/zoho/sync
 *
 * Cron-callable endpoint that walks every org with a CRM connection and
 * pushes a health-ticker payload (flagged-scope count, 12mo spend,
 * plan). Designed to run every 15 minutes from Vercel Cron.
 *
 * Auth: bearer token match against ZOHO_SYNC_CRON_SECRET.
 */

import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase/service";
import { crmClient } from "@/lib/zoho/crm";
import type { ZohoDc } from "@/lib/zoho/oauth";

export async function POST(request: Request) {
  const expected = process.env.ZOHO_SYNC_CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!expected || auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const clientId = process.env.ZOHO_CLIENT_ID;
  const clientSecret = process.env.ZOHO_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: "misconfigured" }, { status: 500 });
  }

  const service = supabaseService();
  const { data: conns } = await service
    .from("zoho_connection")
    .select(
      "org_id, product, dc, api_domain, refresh_token, access_token, access_token_expires_at",
    )
    .eq("product", "crm");

  const results: Array<{ org_id: string; status: string; error?: string }> = [];
  for (const conn of conns ?? []) {
    try {
      const { data: org } = await service
        .from("organizations")
        .select("id, name, slug, plan, zoho_crm_account_id")
        .eq("id", conn.org_id)
        .single();
      if (!org) {
        results.push({ org_id: conn.org_id, status: "skipped", error: "no_org" });
        continue;
      }
      const { data: metricsRows } = await service
        .from("derived_metrics")
        .select("threshold_flag, rolling_12mo_spend_cents")
        .eq("org_id", conn.org_id);
      const flagged = (metricsRows ?? []).filter(
        (m) => m.threshold_flag === "red" || m.threshold_flag === "yellow",
      ).length;
      const spend = (metricsRows ?? []).reduce(
        (a, m) => a + Number(m.rolling_12mo_spend_cents ?? 0),
        0,
      );

      const crm = crmClient({
        dc: conn.dc as ZohoDc,
        apiDomain: conn.api_domain,
        clientId,
        clientSecret,
        refreshToken: conn.refresh_token,
        accessToken: conn.access_token,
        accessTokenExpiresAt: conn.access_token_expires_at
          ? new Date(conn.access_token_expires_at)
          : null,
      });

      const upsertRes = await crm.upsertAccount({
        id: org.zoho_crm_account_id ?? undefined,
        Account_Name: org.name,
        ScopeLedger_Slug: org.slug,
        ScopeLedger_Plan: org.plan,
        ScopeLedger_Flagged_Scopes: flagged,
        ScopeLedger_12mo_Spend_Cents: spend,
      });

      const returnedId = upsertRes.data?.[0]?.details.id;
      if (returnedId && returnedId !== org.zoho_crm_account_id) {
        await service
          .from("organizations")
          .update({ zoho_crm_account_id: returnedId })
          .eq("id", org.id);
      }

      results.push({ org_id: conn.org_id, status: "ok" });
    } catch (err) {
      results.push({
        org_id: conn.org_id,
        status: "failed",
        error: (err as Error).message.slice(0, 200),
      });
    }
  }

  return NextResponse.json({ synced: results.length, results });
}
