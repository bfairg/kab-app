export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { createSupabaseServer } from "@/lib/supabase/server";
import DashboardClient from "./DashboardClient";

type ZoneSummaryRow = {
  zone_id: string;
  zone_name: string;
  capacity: number;
  active_customers: number;
};

export default async function AdminHomePage() {
  const admin = await requireAdmin();
  if (!admin.ok) redirect("/login?next=/admin");

  const supabase = await createSupabaseServer();

  // This assumes your view returns: zone_id, zone_name, capacity, active_customers
  // If your view uses different column names, tell me what they are and I’ll adjust.
  const { data: zoneSummary, error } = await supabase
    .from("admin_zone_summary")
    .select("zone_id,zone_name,capacity,active_customers")
    .order("zone_name");

  if (error) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Admin dashboard</h1>
            <p className="mt-2 text-sm opacity-70">Overview of zones and work.</p>
          </div>
          <Link href="/dashboard" className="btn btn-secondary">
            Back to portal
          </Link>
        </div>

        <div className="mt-6 card p-6">
          <p className="text-sm text-red-500">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
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

      <div className="mt-6">
        <DashboardClient zoneSummary={(zoneSummary ?? []) as ZoneSummaryRow[]} />
      </div>
    </div>
  );
}
