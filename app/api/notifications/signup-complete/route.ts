import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

type Body = {
  customer_id?: string;
};

function getBaseUrl() {
  const h = headers();

  const explicit =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.SITE_URL?.trim() ||
    "";

  if (explicit) return explicit.replace(/\/+$/, "");

  const forwardedProto = h.get("x-forwarded-proto") || "https";
  const forwardedHost = h.get("x-forwarded-host");
  if (forwardedHost) return `${forwardedProto}://${forwardedHost}`;

  const host = h.get("host");
  if (host) return `${forwardedProto}://${host}`;

  return "";
}

function planLabel(plan: any) {
  if (plan === "BIN_PLUS_GREEN") return "Bin + Green";
  if (plan === "BIN") return "Bin";
  return (plan ?? "Not set").toString();
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Body;
    const customerId = (body.customer_id || "").trim();

    if (!customerId) {
      return NextResponse.json({ error: "Missing customer_id" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const resendKey = process.env.RESEND_API_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Server not configured (Supabase keys missing)" },
        { status: 500 }
      );
    }

    if (!resendKey) {
      return NextResponse.json(
        { error: "Server not configured (RESEND_API_KEY missing)" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: customer, error: customerErr } = await supabase
      .from("customers")
      .select("id, full_name, email, mobile, postcode, plan, created_at")
      .eq("id", customerId)
      .maybeSingle();

    if (customerErr) {
      return NextResponse.json(
        { error: customerErr.message || "Failed to load customer" },
        { status: 500 }
      );
    }

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const resend = new Resend(resendKey);

    const baseUrl = getBaseUrl();
    const dashboardUrl = baseUrl ? `${baseUrl}/dashboard` : "/dashboard";
    const loginUrl = baseUrl ? `${baseUrl}/login` : "/login";

    const internalTo = "info@kabgroup.co.uk";
    const fromEmail =
      process.env.RESEND_FROM_EMAIL?.trim() || "KAB Group <info@kabgroup.co.uk>";

    const createdAt = customer.created_at
      ? new Date(customer.created_at).toLocaleString("en-GB", {
          timeZone: "Europe/London",
        })
      : "Not set";

    const internalSubject = `New signup completed: ${customer.postcode || "No postcode"} (${planLabel(
      customer.plan
    )})`;

    const internalHtml = `
      <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; line-height:1.5;">
        <h2 style="margin:0 0 12px;">New signup completed</h2>
        <table style="border-collapse:collapse;">
          <tr><td style="padding:6px 12px 6px 0; color:#555;">Customer ID</td><td style="padding:6px 0;">${customer.id}</td></tr>
          <tr><td style="padding:6px 12px 6px 0; color:#555;">Name</td><td style="padding:6px 0;">${customer.full_name || "Not set"}</td></tr>
          <tr><td style="padding:6px 12px 6px 0; color:#555;">Email</td><td style="padding:6px 0;">${customer.email || "Not set"}</td></tr>
          <tr><td style="padding:6px 12px 6px 0; color:#555;">Mobile</td><td style="padding:6px 0;">${customer.mobile || "Not set"}</td></tr>
          <tr><td style="padding:6px 12px 6px 0; color:#555;">Postcode</td><td style="padding:6px 0;">${customer.postcode || "Not set"}</td></tr>
          <tr><td style="padding:6px 12px 6px 0; color:#555;">Plan</td><td style="padding:6px 0;">${planLabel(customer.plan)}</td></tr>
          <tr><td style="padding:6px 12px 6px 0; color:#555;">Completed</td><td style="padding:6px 0;">${createdAt}</td></tr>
        </table>
      </div>
    `;

    const customerEmail = (customer.email || "").trim();
    const sendCustomerEmail =
      customerEmail.length > 3 &&
      process.env.SEND_SIGNUP_NEXT_STEPS_EMAIL !== "false";

    const customerSubject = "Welcome to KAB Group. Next steps";

    const customerHtml = `
      <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; line-height:1.6;">
        <h2 style="margin:0 0 12px;">You’re all set</h2>
        <p style="margin:0 0 12px;">
          Thanks for signing up. Here’s what happens next:
        </p>
        <ul style="margin:0 0 14px; padding-left:18px;">
          <li><strong>Pro-rata payment:</strong> your first Direct Debit is a pro-rata amount to align you to the normal billing date.</li>
          <li><strong>Next clean date:</strong> this will appear in your dashboard within <strong>48 hours</strong>.</li>
          <li><strong>Dashboard access:</strong> once you’ve created your login, you can sign in and view everything here: <a href="${dashboardUrl}">${dashboardUrl}</a></li>
        </ul>
        <p style="margin:0 0 12px;">
          If you need to sign in again later, use: <a href="${loginUrl}">${loginUrl}</a>
        </p>
        <p style="margin:0; color:#666; font-size:12px;">
          KAB Group. Reliable service, minimal hassle.
        </p>
      </div>
    `;

    const results: any = {
      internal: null,
      customer: null,
      customer_email_sent: false,
    };

    results.internal = await resend.emails.send({
      from: fromEmail,
      to: [internalTo],
      subject: internalSubject,
      html: internalHtml,
      replyTo: internalTo,
    });

    if (sendCustomerEmail) {
      results.customer = await resend.emails.send({
        from: fromEmail,
        to: [customerEmail],
        subject: customerSubject,
        html: customerHtml,
        replyTo: internalTo,
      });
      results.customer_email_sent = true;
    }

    return NextResponse.json({ ok: true, results });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}
