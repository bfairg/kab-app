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

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const full_name = String(body.full_name || "").trim();
    const email = String(body.email || "").trim();
    const mobile = normaliseMobile(body.mobile);
    const postcode = String(body.postcode || "").trim();

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

    const payload = {
      full_name,
      email,
      mobile,
      postcode,
      address_line_1,
      address_line_2,
      town,
      plan,
      created_at: new Date().toISOString(),
    };

    console.log("[customers/create] payload:", payload);

    // Attempt insert first
    const { data: inserted, error: insertError } = await supabase
      .from("customers")
      .insert(payload)
      .select("id, plan")
      .single();

    if (!insertError && inserted) {
      return NextResponse.json({
        ok: true,
        customer_id: inserted.id,
        plan: inserted.plan,
        created: true,
      });
    }

    // Handle duplicate mobile
    if ((insertError as any)?.code === "23505") {
      console.warn("[customers/create] duplicate mobile detected:", mobile);

      const { data: existing, error: selectError } = await supabase
        .from("customers")
        .select("id, plan")
        .eq("mobile", mobile)
        .single();

      if (selectError || !existing) {
        console.error("[customers/create] failed to fetch existing:", selectError);
        return NextResponse.json(
          { error: "Customer exists but could not be retrieved" },
          { status: 500 }
        );
      }

      // Update details to latest submission
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
        })
        .eq("id", existing.id);

      if (updateError) {
        console.error("[customers/create] update failed:", updateError);
      }

      return NextResponse.json({
        ok: true,
        customer_id: existing.id,
        plan: existing.plan,
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
