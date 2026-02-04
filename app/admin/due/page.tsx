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

export default async function AdminDuePage({
  searchParams,
}: {
  searchParams?: { date?: string; zone?: string };
}) {
  /**
   * 1) Admin gate
   */
  const admin = await requireAdmin();

  console.log("ADMIN CHECK RESULT", {
    ok: admin.ok,
    userId: admin.ok ? admin.user.id : null,
  });

  if (!admin.ok) {
    redirect("/login?next=/admin/due");
  }

  /**
   * 2) Parse filters
   */
  const date = (searchParams?.date || "").trim() || todayISO();
  const zone = (searchParams?.zone || "").trim() || "all";
  const zoneId = zone === "all" ? null : zone;

  console.log("ADMIN DUE FILTERS", { date, zone, zoneId });

  /**
   * 3) Supabase server client (authenticated)
   */
  const supabase = await createSupabaseServer();

  /**
   * 4) Load zones
   */
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

  /**
   * 5) Call admin RPC
   */
  const { data: dueRows, error: dueErr } = await supabase.rpc(
    "customers_due_on",
    {
      p_date: date,
      p_zone_id: zoneId,
    }
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

  /**
   * 6) Render board
   */
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
