export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { createSupabaseServer } from "@/lib/supabase/server";
import DashboardClient from "./DashboardClient";

export type ZoneRow = {
  id: string;
  name: string | null;
  capacity: number | null;
  active_customers: number | null;
  is_active: boolean;
};

export type CustomerRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  mobile: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  town: string | null;
  postcode: string | null;
  zone_id: string | null;
  zone_name: string | null;
  status: string | null;
  plan: string | null;
  group_code: string | null;
  created_at: string | null;
};

export default async function AdminHomePage() {
  const admin = await requireAdmin();
  if (!admin.ok) redirect("/login?next=/admin");

  const supabase = await createSupabaseServer();

  // Zones (for capacity/availability)
  const { data: zones, error: zErr } = await supabase
    .from("zones")
    .select("id,name,capacity,active_customers,is_active")
    .eq("is_active", true)
    .order("name");

  if (zErr) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 min-w-0">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Admin dashboard</h1>
            <p className="mt-2 text-sm opacity-70">Overview of zones and work.</p>
          </div>
          <Link href="/dashboard" className="btn btn-secondary">
            Back to portal
          </Link>
        </div>

        <div className="mt-6 card p-6 min-w-0">
          <p className="text-sm text-red-500">{zErr.message}</p>
        </div>
      </div>
    );
  }

  // Recent signups
  const { data: recent, error: rErr } = await supabase
    .from("customers")
    .select(
      "id,full_name,email,mobile,address_line_1,address_line_2,town,postcode,zone_id,status,plan,group_code,created_at,zones(name)"
    )
    .order("created_at", { ascending: false })
    .limit(10);

  // Missing group code (active customers only)
  const { data: missing, error: mErr } = await supabase
    .from("customers")
    .select(
      "id,full_name,email,mobile,address_line_1,address_line_2,town,postcode,zone_id,status,plan,group_code,created_at,zones(name)"
    )
    .eq("status", "active")
    .or("group_code.is.null,group_code.eq.")
    .order("created_at", { ascending: false })
    .limit(50);

  // If these fail, we still show the rest of the dashboard.
  const mapCustomers = (rows: any[] | null | undefined): CustomerRow[] => {
    return (rows ?? []).map((c) => ({
      id: String(c.id),
      full_name: c.full_name ?? null,
      email: c.email ?? null,
      mobile: c.mobile ?? null,
      address_line_1: c.address_line_1 ?? null,
      address_line_2: c.address_line_2 ?? null,
      town: c.town ?? null,
      postcode: c.postcode ?? null,
      zone_id: c.zone_id ?? null,
      zone_name: c.zones?.name ?? null, // important: zones(name) comes back as an object
      status: c.status ?? null,
      plan: c.plan ?? null,
      group_code: c.group_code ?? null,
      created_at: c.created_at ?? null,
    }));
  };

  const recentSignups = mapCustomers(recent);
  const missingGroup = mapCustomers(missing);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 min-w-0">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Admin dashboard</h1>
          <p className="mt-2 text-sm opacity-70">Overview of zones and work.</p>
        </div>

        <div className="flex gap-2">
          <Link href="/admin/due" className="btn btn-secondary">
            Schedule
          </Link>
          <Link href="/admin/customers" className="btn btn-secondary">
            Customers
          </Link>
        </div>
      </div>

      <div className="mt-6 min-w-0">
        <DashboardClient
          zones={(zones ?? []) as ZoneRow[]}
          recentSignups={recentSignups}
          missingGroup={missingGroup}
          errors={{
            recentSignups: rErr?.message ?? null,
            missingGroup: mErr?.message ?? null,
          }}
        />
      </div>
    </div>
  );
}
