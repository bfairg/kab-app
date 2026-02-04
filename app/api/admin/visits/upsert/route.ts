import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin";

type Status = "completed" | "skipped";

function isISODate(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) {
    return new NextResponse("Not authorised", { status: 401 });
  }

  const body = await req.json().catch(() => null);

  const customer_id = String(body?.customer_id || "");
  const due_date = body?.due_date;
  const zone_id = String(body?.zone_id || "");
  const bin_colour = String(body?.bin_colour || "");
  const status = body?.status as Status;
  const notes = String(body?.notes || "").trim();

  if (!customer_id || !zone_id || !bin_colour) {
    return new NextResponse("Missing fields", { status: 400 });
  }

  if (!isISODate(due_date)) {
    return new NextResponse("Invalid due_date", { status: 400 });
  }

  if (status !== "completed" && status !== "skipped") {
    return new NextResponse("Invalid status", { status: 400 });
  }

  if (status === "skipped" && notes.length < 2) {
    return new NextResponse("Skipped requires a note", { status: 400 });
  }

  const supabase = createSupabaseServer();

  const { error } = await supabase
    .from("cleaning_visits")
    .upsert(
      {
        customer_id,
        due_date,
        zone_id,
        bin_colour,
        status,
        notes: notes || null,
        completed_at:
          status === "completed" ? new Date().toISOString() : null,
      },
      {
        onConflict: "customer_id,due_date",
      }
    );

  if (error) {
    return new NextResponse(error.message, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
