export const dynamic = "force-dynamic";
export const revalidate = 0;

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { createSupabaseServer } from "@/lib/supabase/server";
import DashboardClient from "./DashboardClient";

function isoDaysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

type ZoneRow = { id: string; name: string };

type CustomerRow = {
  id: string;
  full_name: string | null;
  postcode: string | null;
  town: string | null;
  address_line_1: string | null;
  status: string | null;
  plan: string | null;
  group_code: string | null;
  created_at: string | null;
  zone_id: string | null;
  zones?: { name: string } | null;
};

export default async function AdminDashboardPage() {
  const admin = await requireAdmin();
  if (!admin.ok) redirect("/login?next=/admin");

  const supabase = await createSupabaseServer();

  const { data: zones, error: zonesErr } = await supabase
    .from("zones")
    .select("id,name")
    .order("name");

  if (zonesErr) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-3xl font-semibold">Admin</h1>
        <div className="mt-6 card p-6">
          <p className="text-sm text-red-500">{zonesErr.message}</p>
        </div>
      </div>
    );
  }

  const since = isoDaysAgo(14);

  const { data: newSignups, error: signupsErr } = await supabase
    .from("customers")
    .select(
      "id,full_name,postcode,town,address_line_1,status,plan,group_code,created_at,zone_id,zones(name)"
    )
    .gte("created_at", `${since}T00:00:00.000Z`)
    .order("created_at", { ascending: false })
    .limit(25);

  const { data: missingGroup, error: missingErr } = await supabase
    .from("customers")
    .select(
      "id,full_name,postcode,town,address_line_1,status,plan,group_code,created_at,zone_id,zones(name)"
    )
    .eq("status", "active")
    .or("group_code.is.null,group_code.eq.")
    .order("created_at", { ascending: false })
    .limit(50);

  if (signupsErr || missingErr) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-3xl font-semibold">Admin</h1>
        <div className="mt-6 card p-6">
          <p className="text-sm text-red-500">
            {signupsErr?.message || missingErr?.message}
          </p>
        </div>
      </div>
    );
  }

  return (
    <DashboardClient
      zones={(zones ?? []) as ZoneRow[]}
      newSignups={(newSignups ?? []) as CustomerRow[]}
      missingGroup={(missingGroup ?? []) as CustomerRow[]}
    />
  );
}
