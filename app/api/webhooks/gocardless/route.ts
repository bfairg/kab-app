import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function gcBaseUrl() {
  const env = (process.env.GOCARDLESS_ENVIRONMENT || "live").toLowerCase();
  return env === "sandbox"
    ? "https://api-sandbox.gocardless.com"
    : "https://api.gocardless.com";
}

async function gcPost(path: string, body: any, idempotencyKey?: string) {
  const token = process.env.GOCARDLESS_ACCESS_TOKEN;
  if (!token) throw new Error("Missing GOCARDLESS_ACCESS_TOKEN");

  const res = await fetch(`${gcBaseUrl()}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "GoCardless-Version": "2015-07-06",
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  const json = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const msg =
      json?.error?.message ||
      JSON.stringify(json)?.slice(0, 300) ||
      `GoCardless error ${res.status}`;
    const err: any = new Error(msg);
    err.gc = json;
    err.status = res.status;
    throw err;
  }

  return json;
}

function computeSignature(rawBody: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
}

function safeEqual(a: string, b: string) {
  const aBuf = Buffer.from(a, "utf8");
  const bBuf = Buffer.from(b, "utf8");
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

function getSubConfig() {
  const amount = Number(process.env.KAB_SUBSCRIPTION_AMOUNT_PENCE || "500"); // 500p = £5
  const currency = (process.env.KAB_SUBSCRIPTION_CURRENCY || "GBP").toUpperCase();
  const interval_unit = (process.env.KAB_SUBSCRIPTION_INTERVAL_UNIT || "monthly").toLowerCase();
  const day_of_month = Number(process.env.KAB_SUBSCRIPTION_DAY_OF_MONTH || "1");

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Invalid KAB_SUBSCRIPTION_AMOUNT_PENCE");
  }
  if (!Number.isFinite(day_of_month) || day_of_month < 1 || day_of_month > 28) {
    throw new Error("Invalid KAB_SUBSCRIPTION_DAY_OF_MONTH (use 1-28)");
  }

  return { amount, currency, interval_unit, day_of_month };
}

function extractBillingRequestId(ev: any): string | null {
  return ev?.links?.billing_request || null;
}

function extractCustomerId(ev: any): string | null {
  return ev?.links?.customer || null;
}

function extractMandateId(ev: any): string | null {
  // billing_requests.fulfilled gives mandate_request_mandate
  // mandates.created gives mandate
  return ev?.links?.mandate_request_mandate || ev?.links?.mandate || null;
}

function shouldActivate(ev: any): boolean {
  // Treat these as "successfully completed the DD setup"
  if (ev?.resource_type === "billing_requests" && ev?.action === "fulfilled") return true;
  if (ev?.resource_type === "mandates" && (ev?.action === "created" || ev?.action === "active")) return true;
  return false;
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();

    const signatureHeader = req.headers.get("Webhook-Signature");
    const secret = process.env.GOCARDLESS_WEBHOOK_SECRET;

    if (!secret) {
      return NextResponse.json({ error: "Missing webhook secret" }, { status: 500 });
    }
    if (!signatureHeader) {
      return NextResponse.json({ error: "Missing signature" }, { status: 401 });
    }

    const expected = computeSignature(rawBody, secret);
    if (!safeEqual(signatureHeader, expected)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const events = Array.isArray(payload?.events) ? payload.events : [];

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl) {
      return NextResponse.json({ error: "Missing NEXT_PUBLIC_SUPABASE_URL" }, { status: 500 });
    }
    if (!serviceRole) {
      return NextResponse.json({ error: "Missing SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceRole);

    for (const ev of events) {
      const evId = ev?.id;
      if (!evId) continue;

      // Deduplicate webhook events (idempotent + retry-safe)
      const { error: insEvErr } = await supabase
        .from("gc_webhook_events")
        .insert({
          gc_event_id: evId,
          resource_type: ev?.resource_type ?? null,
          action: ev?.action ?? null,
          payload: ev,
        });

      if (insEvErr) {
        // Postgres unique_violation = 23505 (duplicate webhook event)
        if ((insEvErr as any).code === "23505") {
          continue;
        }

        // Any other DB error should cause GoCardless to retry the webhook
        console.error("[webhook] failed to persist event", {
          code: (insEvErr as any).code,
          message: insEvErr.message,
          event_id: evId,
        });

        return NextResponse.json(
          { error: "Temporary webhook processing error" },
          { status: 500 }
        );
      }

      const billingRequestId = extractBillingRequestId(ev);
      if (!billingRequestId) {
        // Some events might not include billing_request; ignore for now
        continue;
      }

      // Find your customer row by billing_request id (reliable join for Hosted Payment Pages)
      const { data: customerRow, error: custErr } = await supabase
        .from("customers")
        .select("id, zone_id, gc_customer_id, gc_mandate_id, gc_subscription_id, payment_status, status")
        .eq("gc_billing_request_id", billingRequestId)
        .maybeSingle();

      if (custErr || !customerRow) continue;

      const gcCustomerId = extractCustomerId(ev);
      const mandateId = extractMandateId(ev);

      // Update any IDs we learn from the event
      const updates: any = {};
      if (gcCustomerId && !customerRow.gc_customer_id) updates.gc_customer_id = gcCustomerId;
      if (mandateId && !customerRow.gc_mandate_id) updates.gc_mandate_id = mandateId;

      // If setup is complete, mark active (even if subscription creation is blocked)
      if (shouldActivate(ev)) {
        if (customerRow.payment_status !== "active") updates.payment_status = "active";
        if (customerRow.status !== "active") updates.status = "active";
      }

      if (Object.keys(updates).length > 0) {
        await supabase.from("customers").update(updates).eq("id", customerRow.id);
      }

      // Create subscription once we have a mandate and no subscription yet
      const finalMandateId = mandateId || customerRow.gc_mandate_id;
      if (finalMandateId && !customerRow.gc_subscription_id) {
        try {
          const { amount, currency, interval_unit, day_of_month } = getSubConfig();

          const subResp = await gcPost(
            "/subscriptions",
            {
              subscriptions: {
                amount,
                currency,
                interval_unit,
                day_of_month,
                links: { mandate: finalMandateId },
              },
            },
            `kab-sub-${customerRow.id}`
          );

          const subscriptionId = subResp?.subscriptions?.id as string | undefined;
          if (subscriptionId) {
            await supabase
              .from("customers")
              .update({
                gc_subscription_id: subscriptionId,
                payment_status: "active",
                status: "active",
              })
              .eq("id", customerRow.id);

            // Optional: increment zone counter if you have this RPC
            if (customerRow.zone_id) {
              const { error: rpcErr } = await supabase.rpc(
                "increment_zone_active_customers",
                { z: customerRow.zone_id }
              );

              // Ignore if missing or failing, but log so you can see it
              if (rpcErr) {
                console.warn("[webhook] increment_zone_active_customers failed:", rpcErr.message);
              }
            }
          }
        } catch (e: any) {
          // If subscriptions are not permitted on your account, do not fail the webhook.
          // Log and move on (customer will still be marked active from fulfilled/mandate events).
          console.error("[webhook] subscription create failed:", JSON.stringify(e?.gc || e, null, 2));
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[webhook] error:", e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
