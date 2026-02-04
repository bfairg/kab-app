import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { createSupabaseServer } from "@/lib/supabase/server";

type GroupCode = "A" | "B" | null;

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);

  const customer_id = String(body?.customer_id || "").trim();
  const group_code_raw = String(body?.group_code ?? "").trim().toUpperCase();

  let group_code: GroupCode = null;
  if (group_code_raw === "A") group_code = "A";
  else if (group_code_raw === "B") group_code = "B";
  else if (group_code_raw === "" || group_code_raw === "NULL") group_code = null;
  else {
    return NextResponse.json({ error: "Invalid group_code" }, { status: 400 });
  }

  if (!customer_id) {
    return NextResponse.json({ error: "Missing customer_id" }, { status: 400 });
  }

  const supabase = await createSupabaseServer();

  const { error } = await supabase
    .from("customers")
    .update({ group_code })
    .eq("id", customer_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
