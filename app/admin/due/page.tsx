export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
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
  if (!admin.ok) redirect("/login?next=/admin/due");

  const sp = await Promise.resolve(searchParams);

  const dateRaw = firstString(sp?.date).trim();
  const zoneRaw = firstString(sp?.zone).trim();

  const date = dateRaw || todayISO();
  const zone = zoneRaw || "all";
  const zoneId = zone === "all" ? null : zone;

  const supabase = await createSupabaseServer();

  const { data: zones, error: zErr } = await supabase
    .from("zones")
    .select("id,name")
    .order("name");

  if (zErr) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Schedule</h1>
            <p className="mt-2 text-sm opacity-70">Mark cleans as completed or skipped.</p>
          </div>
          <Link href="/admin" className="btn btn-secondary">
            Back
          </Link>
        </div>

        <div className="mt-6 card p-6">
          <p className="text-sm text-red-500">{zErr.message}</p>
        </div>
      </div>
    );
  }

  const { data: dueRows, error: dueErr } = await supabase.rpc("customers_due_on", {
    p_date: date,
    p_zone_id: zoneId,
  });

  if (dueErr) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Schedule</h1>
            <p className="mt-2 text-sm opacity-70">Mark cleans as completed or skipped.</p>
          </div>
          <Link href="/admin" className="btn btn-secondary">
            Back
          </Link>
        </div>

        <div className="mt-6 card p-6">
          <p className="text-sm text-red-500">{dueErr.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Schedule</h1>
          <p className="mt-2 text-sm opacity-70">Mark cleans as completed or skipped.</p>
        </div>

        <div className="flex gap-2">
          <Link href="/admin/customers" className="btn btn-secondary">
            Customers
          </Link>
          <Link href="/admin" className="btn btn-secondary">
            Back
          </Link>
        </div>
      </div>

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
