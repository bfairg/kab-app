export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { createSupabaseServer } from "@/lib/supabase/server";

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

export default async function AdminCustomersPage() {
  const admin = await requireAdmin();
  if (!admin.ok) redirect("/login?next=/admin/customers");

  const supabase = await createSupabaseServer();

  const { data, error } = await supabase
    .from("customers")
    .select(
      "id,full_name,email,mobile,address_line_1,address_line_2,town,postcode,status,plan,group_code,created_at,zones(name)"
    )
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
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
          <p className="text-sm text-red-500">{error.message}</p>
        </div>
      </div>
    );
  }

  const rows = (data ?? []) as unknown as CustomerRow[];

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
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Customer list</h2>
          <span className="text-sm opacity-70">{rows.length} shown</span>
        </div>

        <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
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
                    No customers found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-xs opacity-60">
          Showing up to 500 records. If you want search and filters, we can add them next.
        </p>
      </div>
    </div>
  );
}
