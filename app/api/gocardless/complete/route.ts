// app/api/gocardless/complete/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendSignupConfirmationEmail } from "../../../../lib/email";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v || !String(v).trim()) throw new Error(`Missing environment variable: ${name}`);
  return String(v).trim();
}

function gcBaseUrl() {
  const env = (process.env.GOCARDLESS_ENVIRONMENT || "live").toLowerCase();
  return env === "sandbox" ? "https://api-sandbox.gocardless.com" : "https://api.gocardless.com";
}

async function readBody(res: Response): Promise<{ text: string; json: any | null }> {
  const text = await res.text();
  if (!text) return { text: "", json: null };
  try {
    return { text, json: JSON.parse(text) };
  } catch {
    return { text, json: null };
  }
}

function makeHttpError(args: {
  status: number;
  statusText: string;
  url: string;
  text: string;
  json: any | null;
}) {
  const err: any = new Error(
    `GoCardless HTTP ${args.status} ${args.statusText} at ${args.url}${
      args.json?.error?.message ? `: ${args.json.error.message}` : args.text ? `: ${args.text}` : ""
    }`
  );
  err.status = args.status;
  err.url = args.url;
  err.text = args.text;
  err.gc = args.json;
  return err;
}

async function gcGet(path: string) {
  const token = requireEnv("GOCARDLESS_ACCESS_TOKEN");
  const url = `${gcBaseUrl()}${path}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "GoCardless-Version": "2015-07-06",
    },
  });

  const { text, json } = await readBody(res);
  if (!res.ok) throw makeHttpError({ status: res.status, statusText: res.statusText, url, text, json });
  return json;
}

async function gcPost(path: string, body: any, idempotencyKey?: string) {
  const token = requireEnv("GOCARDLESS_ACCESS_TOKEN");
  const url = `${gcBaseUrl()}${path}`;

  const res = await fetch(url, {
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

  const { text, json } = await readBody(res);
  if (!res.ok) throw makeHttpError({ status: res.status, statusText: res.statusText, url, text, json });
  return json;
}

type Plan = "BIN" | "BIN_PLUS_GREEN";

function planConfig(plan: Plan) {
  if (plan === "BIN") return { monthlyPence: 1000, label: "Cyclical Wheelie Bin Cleaning" };
  return { monthlyPence: 1500, label: "Cyclical Wheelie Bin Cleaning + Green Bin" };
}

function daysInMonthUTC(date: Date): number {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth();
  return new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
}

function remainingDaysInclusiveUTC(date: Date): number {
  const day = date.getUTCDate();
  return daysInMonthUTC(date) - day + 1;
}

function prorataPence(monthlyPence: number, signupDate: Date): number {
  const dim = daysInMonthUTC(signupDate);
  const remaining = remainingDaysInclusiveUTC(signupDate);
  return Math.floor((monthlyPence * remaining + dim / 2) / dim);
}

function ymdUTC(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function tomorrowUTC(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 1);
  return ymdUTC(d);
}

function penceToPounds(pence: number) {
  return (pence / 100).toFixed(2);
}

// Compare YYYY-MM-DD strings
function maxDateISO(a: string, b: string) {
  return a >= b ? a : b;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function firstOfNextMonthUTC(date: Date): string {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth();
  return ymdUTC(new Date(Date.UTC(y, m + 1, 1)));
}

function firstOfMonthAfterNextUTC(date: Date): string {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth();
  return ymdUTC(new Date(Date.UTC(y, m + 2, 1)));
}

// New rule: if signup after 25th, start month after next; else start next month
function desiredSubscriptionStartUTC(signupDate: Date): string {
  const day = signupDate.getUTCDate();
  if (day >= 26) return firstOfMonthAfterNextUTC(signupDate);
  return firstOfNextMonthUTC(signupDate);
}

export async function POST(req: Request) {
  let customer_id: string | null = null;

  try {
    const body = await req.json();
    customer_id = (body.customer_id || "").trim() || null;

    if (!customer_id) return NextResponse.json({ error: "Missing customer_id" }, { status: 400 });

    const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
    const serviceRole = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl, serviceRole);

    const { data: customer, error: readErr } = await supabase
      .from("customers")
      .select(
        [
          "id",
          "plan",
          "email",
          "full_name",
          "gc_billing_request_id",
          "gc_mandate_id",
          "gc_prorata_payment_id",
          "gc_subscription_id",
          "gc_subscription_start_date",
          "prorata_amount_pence",
          "confirmation_email_sent_at",
        ].join(",")
      )
      .eq("id", customer_id)
      .single();

    if (readErr) {
      return NextResponse.json(
        { error: "Supabase read failed", details: readErr.message, customer_id },
        { status: 500 }
      );
    }
    if (!customer) return NextResponse.json({ error: "Customer not found", customer_id }, { status: 404 });

    const plan = String(customer.plan || "").trim() as Plan;
    if (plan !== "BIN" && plan !== "BIN_PLUS_GREEN") {
      return NextResponse.json(
        { error: "Customer plan not set (BIN or BIN_PLUS_GREEN)", customer_id },
        { status: 400 }
      );
    }

    const cfg = planConfig(plan);

    const billingRequestId: string | null = customer.gc_billing_request_id || null;
    if (!billingRequestId) {
      return NextResponse.json(
        { error: "Missing gc_billing_request_id on customer", customer_id },
        { status: 400 }
      );
    }

    // Already completed
    if (customer.gc_subscription_id && customer.gc_subscription_start_date) {
      return NextResponse.json({ ok: true, already_completed: true });
    }

    const maxAttempts = 12;
    const delayMs = 1500;

    for (let i = 1; i <= maxAttempts; i++) {
      const br = await gcGet(`/billing_requests/${billingRequestId}`);
      const brObj = br?.billing_requests;

      const mandateId: string | undefined =
        brObj?.links?.mandate || brObj?.links?.mandate_request_mandate;

      if (mandateId) {
        const signupDate = new Date();
        const monthKey = signupDate.toISOString().slice(0, 7).replace("-", "");
        const prorataAmount = prorataPence(cfg.monthlyPence, signupDate);

        // Read mandate constraint
        const mandate = await gcGet(`/mandates/${mandateId}`);
        const nextPossible: string | undefined = mandate?.mandates?.next_possible_charge_date;
        const earliestAllowed = nextPossible || tomorrowUTC();

        // Pro-rata charge date must be >= next_possible_charge_date
        const paymentChargeDate = maxDateISO(tomorrowUTC(), earliestAllowed);

        // New cutoff rule for subscription start, then still respect mandate constraint
        const desiredStart = desiredSubscriptionStartUTC(signupDate);
        const subscriptionStart = maxDateISO(desiredStart, earliestAllowed);

        let prorataPaymentId: string | null = null;

        // Payment metadata: max 3 keys
        const paymentMetadata = {
          customer_id: customer.id,
          plan,
          ref: `prorata-${monthKey}`,
        };

        if (prorataAmount > 0) {
          const pay = await gcPost(
            "/payments",
            {
              payments: {
                amount: prorataAmount,
                currency: "GBP",
                charge_date: paymentChargeDate,
                links: { mandate: mandateId },
                metadata: paymentMetadata,
                description: "Pro-rata subscription charge",
              },
            },
            `kab-prorata-${customer.id}-${monthKey}`
          );

          prorataPaymentId = pay?.payments?.id ?? null;
        }

        const sub = await gcPost(
          "/subscriptions",
          {
            subscriptions: {
              amount: cfg.monthlyPence,
              currency: "GBP",
              interval_unit: "monthly",
              start_date: subscriptionStart,
              links: { mandate: mandateId },
              metadata: { customer_id: customer.id, plan },
            },
          },
          `kab-sub-${customer.id}-${subscriptionStart}-${plan}`
        );

        const subscriptionId: string | null = sub?.subscriptions?.id ?? null;

        const { error: updErr } = await supabase
          .from("customers")
          .update({
            gc_mandate_id: mandateId,
            gc_prorata_payment_id: prorataPaymentId,
            gc_subscription_id: subscriptionId,
            gc_subscription_start_date: subscriptionStart,
            prorata_amount_pence: prorataAmount,
          })
          .eq("id", customer.id);

        if (updErr) {
          return NextResponse.json(
            { error: "Supabase update failed", details: updErr.message, customer_id },
            { status: 500 }
          );
        }

        if (customer.email && !customer.confirmation_email_sent_at) {
          await sendSignupConfirmationEmail({
            to: customer.email,
            fullName: customer.full_name,
            planLabel: cfg.label,
            prorataPounds: prorataAmount > 0 ? penceToPounds(prorataAmount) : undefined,
            subscriptionStartDate: subscriptionStart,
            monthlyPricePounds: penceToPounds(cfg.monthlyPence),
            reference: customer.id,
          });

          await supabase
            .from("customers")
            .update({ confirmation_email_sent_at: new Date().toISOString() })
            .eq("id", customer.id);
        }

        return NextResponse.json({
          ok: true,
          mandate_id: mandateId,
          payment_charge_date: paymentChargeDate,
          subscription_start_date: subscriptionStart,
          desired_start_date: desiredStart,
          mandate_next_possible_charge_date: earliestAllowed,
          subscription_id: subscriptionId,
          prorata_amount_pence: prorataAmount,
          prorata_payment_id: prorataPaymentId,
        });
      }

      if (brObj?.status === "ready_to_fulfil") {
        await gcPost(
          `/billing_requests/${billingRequestId}/actions/fulfil`,
          {},
          `kab-br-fulfil-${billingRequestId}`
        );
      }

      await sleep(delayMs);
    }

    return NextResponse.json(
      { error: "Mandate not present on billing request yet (timed out).", customer_id },
      { status: 409 }
    );
  } catch (e: any) {
    return NextResponse.json(
      {
        error: e?.message || "GoCardless complete failed",
        customer_id,
        gc: e?.gc || null,
        http_status: e?.status ?? null,
        http_url: e?.url ?? null,
        http_text: e?.text ?? null,
      },
      { status: 500 }
    );
  }
}
