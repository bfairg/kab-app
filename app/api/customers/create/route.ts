// app/api/customers/create/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Plan = "BIN" | "BIN_PLUS_GREEN";

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

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const full_name = String(body.full_name || "").trim();
    const email = String(body.email || "").trim();
    const mobile = normaliseMobile(body.mobile);

    const postcode = normalisePostcode(body.postcode);

    const address_line_1 = toNullIfEmpty(body.address_line_1);
    const address_line_2 = toNullIfEmpty(body.address_line_2);
    const town = toNullIfEmpty(body.town);

    const plan: Plan = normalisePlan(body.plan);

    if (!full_name) return NextResponse.json({ error: "Missing full_name" }, { status: 400 });
    if (!email) return NextResponse.json({ error: "Missing email" }, { status: 400 });
    if (!mobile) return NextResponse.json({ error: "Missing mobile" }, { status: 400 });
    if (!postcode) return NextResponse.json({ error: "Missing postcode" }, { status: 400 });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
    if (!serviceRole) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

    const supabase = createClient(supabaseUrl, serviceRole);

    // 1) Look up zone_id from full postcode match (zone_postcodes.postcode)
    const { data: zoneRow, error: zoneErr } = await supabase
      .from("zone_postcodes")
      .select("zone_id")
      .eq("postcode", postcode)
      .maybeSingle();

    if (zoneErr) {
      console.error("[customers/create] zone lookup failed:", zoneErr);
      return NextResponse.json({ error: "Zone lookup failed" }, { status: 500 });
    }

    if (!zoneRow?.zone_id) {
      return NextResponse.json(
        { error: `Postcode not currently covered (${postcode})` },
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

    console.log("[customers/create] payload:", payload);

    // 2) Attempt insert first
    const { data: inserted, error: insertError } = await supabase
      .from("customers")
      .insert(payload)
      .select("id, plan, zone_id")
      .single();

    if (!insertError && inserted) {
      return NextResponse.json({
        ok: true,
        customer_id: inserted.id,
        plan: inserted.plan,
        zone_id: inserted.zone_id,
        created: true,
      });
    }

    // 3) Handle duplicate mobile
    if ((insertError as any)?.code === "23505") {
      console.warn("[customers/create] duplicate mobile detected:", mobile);

      const { data: existing, error: selectError } = await supabase
        .from("customers")
        .select("id, plan, zone_id")
        .eq("mobile", mobile)
        .single();

      if (selectError || !existing) {
        console.error("[customers/create] failed to fetch existing:", selectError);
        return NextResponse.json(
          { error: "Customer exists but could not be retrieved" },
          { status: 500 }
        );
      }

      // Update details to latest submission (including zone_id)
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
          zone_id,
        })
        .eq("id", existing.id);

      if (updateError) {
        console.error("[customers/create] update failed:", updateError);
        return NextResponse.json(
          { error: "Update failed", details: updateError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        ok: true,
        customer_id: existing.id,
        plan: plan,
        zone_id: zone_id,
        created: false,
      });
    }

    // Any other DB error
    console.error("[customers/create] insert error:", insertError);
    return NextResponse.json(
      {
        error: "Database error",
        details: insertError?.message ?? null,
      },
      { status: 500 }
    );
  } catch (err: any) {
    console.error("[customers/create] exception:", err);
    return NextResponse.json(
      { error: err?.message || "Create customer failed" },
      { status: 500 }
    );
  }
}
