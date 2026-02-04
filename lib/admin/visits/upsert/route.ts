import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin";

type Status = "completed" | "skipped";

function isISODate(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return new NextResponse("Not authorised", { status: 401 });

  const body = await req.json().catch(() => null);

  const customer_id = String(body?.customer_id || "").trim();
  const due_date = body?.due_date;
  const zone_id = String(body?.zone_id || "").trim();
  const bin_colour = String(body?.bin_colour || "").trim().toLowerCase();
  const status = body?.status as Status;
  const notes = String(body?.notes || "").trim();

  if (!customer_id || !zone_id || !bin_colour) {
    return new NextResponse("Missing required fields", { status: 400 });
  }
  if (!isISODate(due_date)) {
    return new NextResponse("Invalid due_date (expected YYYY-MM-DD)", {
      status: 400,
    });
  }
  if (status !== "completed" && status !== "skipped") {
    return new NextResponse("Invalid status", { status: 400 });
  }
  if (status === "skipped" && notes.length < 2) {
    return new NextResponse("Skipped requires a short note", { status: 400 });
  }

  const supabase = supabaseServer();

  const payload: Record<string, any> = {
    customer_id,
    due_date,
    zone_id,
    bin_colour,
    status,
    notes: notes || null,
    completed_at: status === "completed" ? new Date().toISOString() : null,
  };

  const { error } = await supabase
    .from("cleaning_visits")
    .upsert(payload, { onConflict: "customer_id,due_date" });

  if (error) return new NextResponse(error.message, { status: 500 });

  return NextResponse.json({ ok: true });
}
