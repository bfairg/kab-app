export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { createSupabaseServer } from "@/lib/supabase/server";

type ZoneRow = { id: string; name: string };

type CustomerRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  mobile: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  town: string | null;
  postcode: string | null;
  status: string | null;
  plan: string | null;
  group_code: string | null;
  created_at: string | null;
  zones?: Array<{ name: string }> | null;
};

function fmtDateTime(iso: string | null | undefined) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-GB", { timeZone: "Europe/London" });
}

function zoneName(c: CustomerRow) {
  const z = c.zones;
  if (!z || !Array.isArray(z) || z.length === 0) return "-";
  return z[0]?.name || "-";
}

function joinAddress(c: CustomerRow) {
  return [c.address_line_1, c.address_line_2, c.town, c.postcode]
    .filter(Boolean)
    .join(", ");
}

function firstString(v: unknown): string {
  if (Array.isArray(v)) return String(v[0] ?? "");
  return String(v ?? "");
}

function cleanLike(s: string) {
  return s.trim().replace(/\s+/g, " ");
}

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams?: any;
}) {
  const admin = await requireAdmin();
  if (!admin.ok) redirect("/login?next=/admin/customers");

  const sp = await Promise.resolve(searchParams);

  const zone = firstString(sp?.zone).trim() || "all";
  const status = firstString(sp?.status).trim() || "all";
  const q = cleanLike(firstString(sp?.q));

  const supabase = await createSupabaseServer();

  // Zones for filter dropdown
  const { data: zones, error: zonesErr } = await supabase
    .from("zones")
    .select("id,name")
    .order("name");

  if (zonesErr) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Customers</h1>
            <p className="mt-2 text-sm opacity-70">All customer records and key details.</p>
          </div>
          <Link href="/admin" className="btn btn-secondary">
            Back
          </Link>
        </div>

        <div className="mt-6 card p-6">
          <p className="text-sm text-red-500">{zonesErr.message}</p>
        </div>
      </div>
    );
  }

  // Build query with filters
  let query = supabase
    .from("customers")
    .select(
      "id,full_name,email,mobile,address_line_1,address_line_2,town,postcode,status,plan,group_code,created_at,zone_id,zones(name)"
    )
    .order("created_at", { ascending: false })
    .limit(500);

  if (zone !== "all") query = query.eq("zone_id", zone);
  if (status !== "all") query = query.eq("status", status);

  if (q) {
    const like = `%${q}%`;
    // Search name + address parts
    query = query.or(
      [
        `full_name.ilike.${like}`,
        `address_line_1.ilike.${like}`,
        `address_line_2.ilike.${like}`,
        `town.ilike.${like}`,
        `postcode.ilike.${like}`,
      ].join(",")
    );
  }

  const { data, error } = await query;

  if (error) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Customers</h1>
            <p className="mt-2 text-sm opacity-70">All customer records and key details.</p>
          </div>

          <div className="flex gap-2">
            <Link href="/admin/due" className="btn btn-secondary">
              Schedule
            </Link>
            <Link href="/admin" className="btn btn-secondary">
              Back
            </Link>
          </div>
        </div>

        <div className="mt-6 card p-6">
          <p className="text-sm text-red-500">{error.message}</p>
        </div>
      </div>
    );
  }

  const zoneRows = (zones ?? []) as unknown as ZoneRow[];
  const rows = (data ?? []) as unknown as CustomerRow[];

  // Preserve filters in the form via defaultValue
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Customers</h1>
          <p className="mt-2 text-sm opacity-70">All customer records and key details.</p>
        </div>

        <div className="flex gap-2">
          <Link href="/admin/due" className="btn btn-secondary">
            Schedule
          </Link>
          <Link href="/admin" className="btn btn-secondary">
            Back
          </Link>
        </div>
      </div>

      <div className="mt-6 card p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Customer list</h2>
            <p className="mt-1 text-sm opacity-70">
              {rows.length} shown (max 500). Use filters to narrow down.
            </p>
          </div>

          <form className="grid gap-3 md:grid-cols-3 md:items-end" action="/admin/customers">
            <div className="flex flex-col gap-1">
              <label className="text-xs opacity-70">Zone</label>
              <select className="input" name="zone" defaultValue={zone}>
                <option value="all">All zones</option>
                {zoneRows.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs opacity-70">Status</label>
              <select className="input" name="status" defaultValue={status}>
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs opacity-70">Search</label>
              <input
                className="input"
                name="q"
                defaultValue={q}
                placeholder="Name or address..."
              />
            </div>

            <div className="md:col-span-3 flex gap-2">
              <button className="btn" type="submit">
                Apply
              </button>
              <Link href="/admin/customers" className="btn btn-secondary">
                Clear
              </Link>
            </div>
          </form>
        </div>

        <div className="mt-5 overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full min-w-[1200px] text-sm">
            <thead className="bg-white/5">
              <tr className="text-left opacity-80">
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Zone</th>
                <th className="py-3 px-4">Group</th>
                <th className="py-3 px-4">Plan</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Address</th>
                <th className="py-3 px-4">Created</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-t border-white/10">
                  <td className="py-3 px-4 font-medium">{c.full_name || "-"}</td>
                  <td className="py-3 px-4">{zoneName(c)}</td>
                  <td className="py-3 px-4">
                    {(c.group_code || "").trim() ? c.group_code : "UNASSIGNED"}
                  </td>
                  <td className="py-3 px-4">{c.plan || "-"}</td>
                  <td className="py-3 px-4">{c.status || "-"}</td>
                  <td className="py-3 px-4">
                    <div className="flex flex-col gap-1">
                      <span className="opacity-80">{c.mobile || "-"}</span>
                      <span className="opacity-60">{c.email || "-"}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 opacity-80">{joinAddress(c) || "-"}</td>
                  <td className="py-3 px-4">{fmtDateTime(c.created_at)}</td>
                </tr>
              ))}

              {rows.length === 0 && (
                <tr className="border-t border-white/10">
                  <td colSpan={8} className="py-10 px-4 opacity-70">
                    No customers match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-xs opacity-60">
          Search matches full name and address fields (address lines, town, postcode).
        </p>
      </div>
    </div>
  );
}
