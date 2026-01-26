// app/api/gocardless/start/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v || !String(v).trim()) throw new Error(`Missing environment variable: ${name}`);
  return String(v).trim();
}

function gcBaseUrl() {
  const env = (process.env.GOCARDLESS_ENVIRONMENT || "live").toLowerCase();
  return env === "live" ? "https://api.gocardless.com" : "https://api-sandbox.gocardless.com";
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

  if (!res.ok) {
    throw makeHttpError({
      status: res.status,
      statusText: res.statusText,
      url,
      text,
      json,
    });
  }

  return json;
}

function splitName(fullName: string | null | undefined) {
  const parts = (fullName || "").trim().split(/\s+/).filter(Boolean);
  return {
    given_name: parts[0] || "Customer",
    family_name: parts.slice(1).join(" ") || " ",
  };
}

export async function POST(req: Request) {
  let customer_id: string | null = null;

  try {
    const body = await req.json();
    customer_id = (body.customer_id || "").trim() || null;

    if (!customer_id) {
      return NextResponse.json({ error: "Missing customer_id" }, { status: 400 });
    }

    const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
    const serviceRole = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl, serviceRole);

    const { data: customer, error } = await supabase
      .from("customers")
      .select("id, full_name, email, address_line_1, address_line_2, town, postcode")
      .eq("id", customer_id)
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Supabase read failed", details: error.message, customer_id },
        { status: 500 }
      );
    }

    if (!customer) {
      return NextResponse.json({ error: "Customer not found", customer_id }, { status: 404 });
    }

    const baseUrl = requireEnv("NEXT_PUBLIC_SITE_URL");
    const { given_name, family_name } = splitName(customer.full_name);

    // Create a fresh Billing Request every time (avoids stale IDs during testing)
    const br = await gcPost(
      "/billing_requests",
      {
        billing_requests: {
          mandate_request: { currency: "GBP" },
          metadata: { supabase_customer_id: customer.id },
        },
      },
      `kab-br-${customer.id}-${Date.now()}`
    );

    const billingRequestId: string | null = br?.billing_requests?.id ?? null;

    if (!billingRequestId) {
      return NextResponse.json(
        { error: "Missing billing request id from GoCardless" },
        { status: 500 }
      );
    }

    // IMPORTANT FIX: auto_fulfil true so the hosted flow fulfils the request and creates the mandate
    const flow = await gcPost(
      "/billing_request_flows",
      {
        billing_request_flows: {
          redirect_uri: `${baseUrl}/signup/completion?customer_id=${customer.id}&returned=1`,
          exit_uri: `${baseUrl}/signup?exit=1&customer_id=${customer.id}`,
          links: { billing_request: billingRequestId },

          auto_fulfil: true,

          prefilled_customer: {
            given_name,
            family_name,
            email: customer.email ?? undefined,
            address_line1: customer.address_line_1 ?? undefined,
            address_line2: customer.address_line_2 ?? undefined,
            city: customer.town ?? undefined,
            postal_code: customer.postcode,
            country_code: "GB",
          },
        },
      },
      `kab-brf-${billingRequestId}`
    );

    const authorisationUrl = flow?.billing_request_flows?.authorisation_url;
    const flowId = flow?.billing_request_flows?.id;

    if (!authorisationUrl || !flowId) {
      return NextResponse.json(
        { error: "Missing authorisation_url or flow id from GoCardless" },
        { status: 500 }
      );
    }

    // Persist both IDs for complete step
    const { error: updErr } = await supabase
      .from("customers")
      .update({
        gc_billing_request_id: billingRequestId,
        gc_billing_request_flow_id: flowId,
      })
      .eq("id", customer.id);

    if (updErr) {
      return NextResponse.json(
        { error: "Failed to save GoCardless IDs", details: updErr.message, customer_id },
        { status: 500 }
      );
    }

    return NextResponse.json({
      authorisation_url: authorisationUrl,
      billing_request_id: billingRequestId,
      billing_request_flow_id: flowId,
      gc_base_url: gcBaseUrl(),
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        error: e?.message || "GoCardless start failed",
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
