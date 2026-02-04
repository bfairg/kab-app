import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin";

type Status = "completed" | "skipped" | "pending";

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);

  const customer_id = String(body?.customer_id || "").trim();
  const due_date = String(body?.due_date || "").trim();
  const status = String(body?.status || "").trim() as Status;

  const notesRaw = body?.notes == null ? null : String(body.notes);
  const notes = notesRaw ? notesRaw.trim() : null;

  const zone_id = body?.zone_id ? String(body.zone_id).trim() : null;
  const bin_colour = body?.bin_colour ? String(body.bin_colour).trim() : null;

  if (!customer_id || !due_date) {
    return NextResponse.json(
      { error: "Missing customer_id or due_date" },
      { status: 400 }
    );
  }

  if (status !== "completed" && status !== "skipped" && status !== "pending") {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  if (status === "skipped" && (!notes || notes.length < 2)) {
    return NextResponse.json(
      { error: "Skip notes required" },
      { status: 400 }
    );
  }

  const supabase = await createSupabaseServer();

  const payload: Record<string, any> = {
    customer_id,
    due_date,
    status,
  };

  // Keep context when recording a real action
  if (status === "completed" || status === "skipped") {
    if (zone_id) payload.zone_id = zone_id;
    if (bin_colour) payload.bin_colour = bin_colour;
  }

  // Timestamp + notes behavior
  if (status === "completed") {
    payload.completed_at = new Date().toISOString();
    payload.notes = notes ?? null;
  } else if (status === "skipped") {
    payload.completed_at = null;
    payload.notes = notes ?? null;
  } else {
    // pending = undo
    payload.completed_at = null;
    payload.notes = null;
  }

  const { error } = await supabase.from("cleaning_visits").upsert(payload, {
    onConflict: "customer_id,due_date",
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
