import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { createSupabaseServer } from "@/lib/supabase/server";
import { Section } from "@/components/Section";
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
  const admin = await requireAdmin();
  if (!admin.ok) redirect("/login?next=/admin/due");

  const date = (searchParams?.date || "").trim() || todayISO();
  const zone = (searchParams?.zone || "").trim() || "all";

  const supabase = await createSupabaseServer();

  const { data: zones } = await supabase
    .from("zones")
    .select("id,name")
    .order("name");

  let dueQuery = supabase
    .from("customers_next_due")
    .select(
      "customer_id,full_name,address_line_1,address_line_2,town,postcode,zone_id,zone_name,group_code,plan,due_date,bin_colour,show_green,week_includes_green"
    )
    .eq("due_date", date);

  if (zone !== "all") dueQuery = dueQuery.eq("zone_id", zone);

  const { data: dueRows, error: dueErr } = await dueQuery.order("postcode");

  if (dueErr) {
    return (
      <Section title="Due list" subtitle="Mark cleans as completed or skipped.">
        <div className="card p-6">
          <p className="text-sm text-red-300">{dueErr.message}</p>
        </div>
      </Section>
    );
  }

  const { data: visits, error: visitsErr } = await supabase
    .from("cleaning_visits")
    .select("customer_id,due_date,status,completed_at,notes")
    .eq("due_date", date);

  if (visitsErr) {
    return (
      <Section title="Due list" subtitle="Mark cleans as completed or skipped.">
        <div className="card p-6">
          <p className="text-sm text-red-300">{visitsErr.message}</p>
        </div>
      </Section>
    );
  }

  return (
    <Section title="Due list" subtitle="Mark cleans as completed or skipped.">
      <DueBoardClient
        zones={zones ?? []}
        initialDate={date}
        initialZone={zone}
        initialRows={dueRows ?? []}
        initialVisits={visits ?? []}
      />
    </Section>
  );
}
