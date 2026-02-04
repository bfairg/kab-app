import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { supabaseServer } from "@/lib/supabase/server";
import DueBoardClient from "./DueBoardClient";

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

type Zone = { id: string; name: string };

export default async function AdminDuePage({
  searchParams,
}: {
  searchParams?: { date?: string; zone?: string };
}) {
  const admin = await requireAdmin();
  if (!admin.ok) redirect("/login?next=/admin/due");

  const date = (searchParams?.date || "").trim() || todayISO();
  const zone = (searchParams?.zone || "all").trim();

  const supabase = supabaseServer();

  const { data: zones } = await supabase
    .from("zones")
    .select("id,name")
    .order("name", { ascending: true });

  // Due list for the selected date
  let dueQuery = supabase
    .from("customers_next_due")
    .select(
      "customer_id,full_name,address_line_1,address_line_2,town,postcode,zone_id,zone_name,group_code,plan,due_date,bin_colour,show_green,week_includes_green"
    )
    .eq("due_date", date);

  if (zone !== "all") dueQuery = dueQuery.eq("zone_id", zone);

  const { data: dueRows, error: dueErr } = await dueQuery.order("postcode", {
    ascending: true,
  });

  if (dueErr) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-2xl font-semibold">Due list</h1>
        <p className="mt-4 text-sm text-red-700">{dueErr.message}</p>
      </div>
    );
  }

  // Visit status for that date (one query)
  const { data: visits, error: vErr } = await supabase
    .from("cleaning_visits")
    .select("customer_id,due_date,status,completed_at,notes")
    .eq("due_date", date);

  if (vErr) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-2xl font-semibold">Due list</h1>
        <p className="mt-4 text-sm text-red-700">{vErr.message}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Due list</h1>
          <p className="mt-1 text-sm text-black/70">
            Mark completed or skipped (with note).
          </p>
        </div>
      </div>

      <div className="mt-6">
        <DueBoardClient
          zones={(zones as Zone[]) ?? []}
          initialDate={date}
          initialZone={zone}
          initialRows={dueRows ?? []}
          initialVisits={visits ?? []}
        />
      </div>
    </div>
  );
}
