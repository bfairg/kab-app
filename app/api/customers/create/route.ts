// app/api/customers/create/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

type Plan = "BIN" | "BIN_PLUS_GREEN";

const ROUTE_VERSION = "customers-create-debug-v3-2026-02-03";

function normalisePlan(input: unknown): Plan {
  const v = String(input || "").trim();
  if (v === "BIN_PLUS_GREEN") return "BIN_PLUS_GREEN";
  return "BIN";
}

function toNullIfEmpty(v: unknown) {
  const s = String(v ?? "").trim();
  return s.length ? s : null;
}

function normaliseMobile(input: unknown) {
  const raw = String(input || "").trim();
  return raw.replace(/\s+/g, "");
}

function normalisePostcode(input: unknown) {
  // Convert to "LA3 2FW" format
  return String(input || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");
}

function safeErr(e: any) {
  if (!e) return null;
  return {
    message: e.message ?? String(e),
    code: e.code ?? null,
    details: e.details ?? null,
    hint: e.hint ?? null,
  };
}

async function sendAdminNewSignupEmail(input: {
  full_name: string;
  email: string;
  mobile: string;
  postcode: string;
  plan: Plan;
  zone_id: string;
  address_line_1: string | null;
  address_line_2: string | null;
  town: string | null;
  customer_id: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  const to = process.env.KAB_ADMIN_NOTIFY_EMAIL;

  // Not configured means no email, but signup still succeeds
  if (!apiKey || !from || !to) return;

  const resend = new Resend(apiKey);

  const subject = `New KAB signup: ${input.full_name} (${input.postcode})`;

  const esc = (s: string) =>
    s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.5">
      <h2 style="margin: 0 0 12px">New signup received</h2>
      <table cellpadding="6" cellspacing="0" style="border-collapse: collapse; width: 100%; max-width: 680px;">
        <tr><td style="border:1px solid #e5e7eb; font-weight:600; width:180px;">Name</td><td style="border:1px solid #e5e7eb;">${esc(input.full_name)}</td></tr>
        <tr><td style="border:1px solid #e5e7eb; font-weight:600;">Postcode</td><td style="border:1px solid #e5e7eb;">${esc(input.postcode)}</td></tr>
        <tr><td style="border:1px solid #e5e7eb; font-weight:600;">Town</td><td style="border:1px solid #e5e7eb;">${esc(input.town || "-")}</td></tr>
        <tr><td style="border:1px solid #e5e7eb; font-weight:600;">Address 1</td><td style="border:1px solid #e5e7eb;">${esc(input.address_line_1 || "-")}</td></tr>
        <tr><td style="border:1px solid #e5e7eb; font-weight:600;">Address 2</td><td style="border:1px solid #e5e7eb;">${esc(input.address_line_2 || "-")}</td></tr>
        <tr><td style="border:1px solid #e5e7eb; font-weight:600;">Mobile</td><td style="border:1px solid #e5e7eb;">${esc(input.mobile)}</td></tr>
        <tr><td style="border:1px solid #e5e7eb; font-weight:600;">Customer email</td><td style="border:1px solid #e5e7eb;">${esc(input.email)}</td></tr>
        <tr><td style="border:1px solid #e5e7eb; font-weight:600;">Plan</td><td style="border:1px solid #e5e7eb;">${esc(input.plan)}</td></tr>
        <tr><td style="border:1px solid #e5e7eb; font-weight:600;">Zone</td><td style="border:1px solid #e5e7eb;">${esc(input.zone_id)}</td></tr>
        <tr><td style="border:1px solid #e5e7eb; font-weight:600;">Customer ID</td><td style="border:1px solid #e5e7eb;">${esc(input.customer_id)}</td></tr>
      </table>
      <p style="margin-top: 14px; color: #6b7280; font-size: 12px;">
        Group assignment is manual. Assign A or B in the admin dashboard.
      </p>
    </div>
  `;

  await resend.emails.send({
    from,
    to: [to],
    subject,
    html,
  });
}

export async function POST(req: Request) {
  const debug: Record<string, any> = {
    route_version: ROUTE_VERSION,
    stage: "start",
  };

  try {
    debug.stage = "parse_body";
    const body = await req.json();

    const full_name = String(body.full_name || "").trim();
    const email = String(body.email || "").trim();
    const mobile = normaliseMobile(body.mobile);
    const postcode = normalisePostcode(body.postcode);

    const address_line_1 = toNullIfEmpty(body.address_line_1);
    const address_line_2 = toNullIfEmpty(body.address_line_2);
    const town = toNullIfEmpty(body.town);

    const plan: Plan = normalisePlan(body.plan);

    debug.input = {
      full_name_present: !!full_name,
      email_present: !!email,
      mobile_present: !!mobile,
      postcode,
      plan,
    };

    if (!full_name) return NextResponse.json({ error: "Missing full_name", debug }, { status: 400 });
    if (!email) return NextResponse.json({ error: "Missing email", debug }, { status: 400 });
    if (!mobile) return NextResponse.json({ error: "Missing mobile", debug }, { status: 400 });
    if (!postcode) return NextResponse.json({ error: "Missing postcode", debug }, { status: 400 });

    debug.stage = "env";
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

    debug.env = {
      has_supabase_url: !!supabaseUrl,
      has_service_role: !!serviceRole,
    };

    if (!supabaseUrl) {
      return NextResponse.json({ error: "Missing NEXT_PUBLIC_SUPABASE_URL", debug }, { status: 500 });
    }
    if (!serviceRole) {
      return NextResponse.json({ error: "Missing SUPABASE_SERVICE_ROLE_KEY", debug }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceRole);

    debug.stage = "zone_lookup";
    const { data: zoneRow, error: zoneErr } = await supabase
      .from("zone_postcodes")
      .select("zone_id")
      .eq("postcode", postcode)
      .maybeSingle();

    debug.zone_lookup = {
      postcode,
      found: !!zoneRow?.zone_id,
      zone_id: zoneRow?.zone_id ?? null,
      error: safeErr(zoneErr),
    };

    if (zoneErr) {
      return NextResponse.json(
        { error: "Zone lookup failed", debug },
        { status: 500 }
      );
    }

    if (!zoneRow?.zone_id) {
      return NextResponse.json(
        { error: `Postcode not currently covered (${postcode})`, debug },
        { status: 400 }
      );
    }

    const zone_id = zoneRow.zone_id as string;

    const payload = {
      full_name,
      email,
      mobile,
      postcode,
      address_line_1,
      address_line_2,
      town,
      plan,
      zone_id,
      created_at: new Date().toISOString(),
    };

    debug.stage = "insert_attempt";
    debug.payload = {
      postcode: payload.postcode,
      zone_id: payload.zone_id,
      mobile: payload.mobile,
      plan: payload.plan,
      has_address1: !!payload.address_line_1,
      has_town: !!payload.town,
    };

    const { data: inserted, error: insertError } = await supabase
      .from("customers")
      .insert(payload)
      .select("id, plan, zone_id")
      .single();

    debug.insert = {
      ok: !insertError,
      error: safeErr(insertError),
      inserted: inserted ? { id: inserted.id, plan: inserted.plan, zone_id: inserted.zone_id } : null,
    };

    if (!insertError && inserted) {
      // Email notification for true new signup
      sendAdminNewSignupEmail({
        full_name,
        email,
        mobile,
        postcode,
        plan,
        zone_id,
        address_line_1,
        address_line_2,
        town,
        customer_id: inserted.id,
      }).catch((e) => console.error("ADMIN SIGNUP EMAIL FAILED", e));

      debug.stage = "done_inserted";
      return NextResponse.json({
        ok: true,
        created: true,
        customer_id: inserted.id,
        plan: inserted.plan,
        zone_id: inserted.zone_id,
        debug,
      });
    }

    // Duplicate mobile path
    if ((insertError as any)?.code === "23505") {
      debug.stage = "duplicate_mobile_select";

      const { data: existing, error: selectError } = await supabase
        .from("customers")
        .select("id, plan, zone_id")
        .eq("mobile", mobile)
        .single();

      debug.duplicate = {
        select_error: safeErr(selectError),
        existing: existing ? { id: existing.id, plan: existing.plan, zone_id: existing.zone_id } : null,
      };

      if (selectError || !existing) {
        return NextResponse.json(
          { error: "Customer exists but could not be retrieved", debug },
          { status: 500 }
        );
      }

      debug.stage = "duplicate_mobile_update";
      const { error: updateError } = await supabase
        .from("customers")
        .update({
          full_name,
          email,
          postcode,
          address_line_1,
          address_line_2,
          town,
          plan,
          zone_id, // IMPORTANT: update zone_id too
        })
        .eq("id", existing.id);

      debug.duplicate.update_error = safeErr(updateError);

      if (updateError) {
        return NextResponse.json(
          { error: "Update failed", debug },
          { status: 500 }
        );
      }

      debug.stage = "done_duplicate_updated";
      return NextResponse.json({
        ok: true,
        created: false,
        customer_id: existing.id,
        plan,
        zone_id,
        debug,
      });
    }

    debug.stage = "db_error";
    return NextResponse.json(
      { error: "Database error", details: insertError?.message ?? null, debug },
      { status: 500 }
    );
  } catch (err: any) {
    debug.stage = "exception";
    debug.exception = safeErr(err);
    return NextResponse.json(
      { error: err?.message || "Create customer failed", debug },
      { status: 500 }
    );
  }
}
