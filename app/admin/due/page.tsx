export const dynamic = "force-dynamic";
export const revalidate = 0;

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { createSupabaseServer } from "@/lib/supabase/server";
import DueBoardClient from "./DueBoardClient";

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function firstString(v: unknown): string {
  if (Array.isArray(v)) return String(v[0] ?? "");
  return String(v ?? "");
}

export default async function AdminDuePage({
  searchParams,
}: {
  searchParams?: any;
}) {
  const admin = await requireAdmin();

  console.log("ADMIN CHECK RESULT", {
    ok: admin.ok,
    userId: admin.ok ? admin.user.id : null,
  });

  if (!admin.ok) {
    redirect("/login?next=/admin/due");
  }

  // In some Next builds, searchParams can be promise-like. Make it safe.
  const sp = await Promise.resolve(searchParams);

  const dateRaw = firstString(sp?.date).trim();
  const zoneRaw = firstString(sp?.zone).trim();

  const date = dateRaw || todayISO();
  const zone = zoneRaw || "all";
  const zoneId = zone === "all" ? null : zone;

  console.log("ADMIN DUE FILTERS", { date, zone, zoneId });

  const supabase = await createSupabaseServer();

  const { data: zones, error: zErr } = await supabase
    .from("zones")
    .select("id,name")
    .order("name");

  if (zErr) {
    console.error("ZONE LOAD ERROR", zErr);
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-3xl font-semibold">Due list</h1>
        <p className="mt-2 text-sm opacity-70">
          Mark cleans as completed or skipped.
        </p>
        <div className="mt-6 card p-6">
          <p className="text-sm text-red-500">{zErr.message}</p>
        </div>
      </div>
    );
  }

  const { data: dueRows, error: dueErr } = await supabase.rpc(
    "customers_due_on",
    { p_date: date, p_zone_id: zoneId }
  );

  console.log("DUE RPC RESULT", {
    date,
    zone,
    zoneId,
    count: dueRows ? dueRows.length : 0,
    error: dueErr
      ? {
          message: dueErr.message,
          details: dueErr.details,
          hint: dueErr.hint,
          code: dueErr.code,
        }
      : null,
  });

  if (dueErr) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-3xl font-semibold">Due list</h1>
        <p className="mt-2 text-sm opacity-70">
          Mark cleans as completed or skipped.
        </p>
        <div className="mt-6 card p-6">
          <p className="text-sm text-red-500">{dueErr.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl font-semibold">Due list</h1>
      <p className="mt-2 text-sm opacity-70">
        Mark cleans as completed or skipped.
      </p>

      <div className="mt-6">
        <DueBoardClient
          zones={zones ?? []}
          initialDate={date}
          initialZone={zone}
          initialRows={(dueRows ?? []) as any}
          initialVisits={[]}
        />
      </div>
    </div>
  );
}
