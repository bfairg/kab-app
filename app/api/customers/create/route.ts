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
  // keep it simple: strip spaces, keep leading + if present
  const raw = String(input || "").trim();
  const compact = raw.replace(/\s+/g, "");
  return compact;
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

    const insertPayload: Record<string, any> = {
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

    console.log("[customers/create] insert payload:", insertPayload);

    const { data, error } = await supabase
      .from("customers")
      .insert(insertPayload)
      .select("id, plan")
      .single();

    if (error) {
      console.error("[customers/create] supabase error:", error);
      return NextResponse.json(
        {
          error: "Supabase insert failed",
          details: error.message,
          hint: (error as any).hint ?? null,
          code: (error as any).code ?? null,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, customer_id: data.id, plan: data.plan });
  } catch (e: any) {
    console.error("[customers/create] exception:", e);
    return NextResponse.json(
      { error: e?.message || "Create customer failed" },
      { status: 500 }
    );
  }
}
