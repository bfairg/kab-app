"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

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

export default function DashboardClient({
  zones,
  newSignups,
  missingGroup,
}: {
  zones: ZoneRow[];
  newSignups: CustomerRow[];
  missingGroup: CustomerRow[];
}) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();

  const [draftGroups, setDraftGroups] = useState<Record<string, "A" | "B" | "">>(
    () => {
      const init: Record<string, "A" | "B" | ""> = {};
      for (const c of missingGroup) {
        const v = String(c.group_code || "").trim().toUpperCase();
        init[c.id] = v === "A" || v === "B" ? (v as "A" | "B") : "";
      }
      return init;
    }
  );

  const missingCount = useMemo(() => missingGroup.length, [missingGroup.length]);

  async function saveGroup(customerId: string) {
    const group_code = draftGroups[customerId] ?? "";

    startTransition(async () => {
      const res = await fetch("/api/admin/customers/set-group", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_id: customerId, group_code }),
      });

      if (!res.ok) {
        const txt = await res.text();
        alert(`Failed: ${txt}`);
        return;
      }

      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Admin</h1>
          <p className="mt-2 text-sm opacity-70">
            Overview for signups and operational housekeeping.
          </p>
        </div>

        <div className="flex gap-2">
          <Link href="/admin/customers" className="btn btn-secondary">
            Customers
          </Link>
          <Link href="/admin/due" className="btn">
            Schedule
          </Link>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">New signups (last 14 days)</h2>
            <span className="text-sm opacity-70">{newSignups.length}</span>
          </div>

          <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-white/5">
                <tr className="text-left opacity-80">
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Postcode</th>
                  <th className="py-3 px-4">Zone</th>
                  <th className="py-3 px-4">Plan</th>
                  <th className="py-3 px-4">Group</th>
                  <th className="py-3 px-4">Created</th>
                </tr>
              </thead>
              <tbody>
                {newSignups.map((c) => (
                  <tr key={c.id} className="border-t border-white/10">
                    <td className="py-3 px-4 font-medium">{c.full_name || "-"}</td>
                    <td className="py-3 px-4">{c.postcode || "-"}</td>
                    <td className="py-3 px-4">{zoneName(c)}</td>
                    <td className="py-3 px-4">{c.plan || "-"}</td>
                    <td className="py-3 px-4">
                      {(c.group_code || "").trim() ? c.group_code : "UNASSIGNED"}
                    </td>
                    <td className="py-3 px-4">{fmtDateTime(c.created_at)}</td>
                  </tr>
                ))}

                {newSignups.length === 0 && (
                  <tr className="border-t border-white/10">
                    <td colSpan={6} className="py-8 px-4 opacity-70">
                      No signups in the last 14 days.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Active customers missing group</h2>
            <span className="text-sm opacity-70">{missingCount}</span>
          </div>

          <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-white/5">
                <tr className="text-left opacity-80">
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Postcode</th>
                  <th className="py-3 px-4">Zone</th>
                  <th className="py-3 px-4">Plan</th>
                  <th className="py-3 px-4">Created</th>
                  <th className="py-3 px-4">Assign group</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>

              <tbody>
                {missingGroup.map((c) => {
                  const value = draftGroups[c.id] ?? "";
                  const canSave = value === "A" || value === "B";

                  return (
                    <tr key={c.id} className="border-t border-white/10">
                      <td className="py-3 px-4 font-medium">{c.full_name || "-"}</td>
                      <td className="py-3 px-4">{c.postcode || "-"}</td>
                      <td className="py-3 px-4">{zoneName(c)}</td>
                      <td className="py-3 px-4">{c.plan || "-"}</td>
                      <td className="py-3 px-4">{fmtDateTime(c.created_at)}</td>

                      <td className="py-3 px-4">
                        <select
                          className="input"
                          value={value}
                          onChange={(e) =>
                            setDraftGroups((prev) => ({
                              ...prev,
                              [c.id]: e.target.value as "A" | "B" | "",
                            }))
                          }
                        >
                          <option value="">Select</option>
                          <option value="A">A</option>
                          <option value="B">B</option>
                        </select>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          className="btn"
                          disabled={busy || !canSave}
                          onClick={() => saveGroup(c.id)}
                        >
                          Save
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {missingGroup.length === 0 && (
                  <tr className="border-t border-white/10">
                    <td colSpan={7} className="py-8 px-4 opacity-70">
                      Everyone active has a group assigned.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-xs opacity-60">
            Assigning group affects scheduling. Use this to balance workload between A and B.
          </p>
        </div>
      </div>

      <div className="mt-10 card p-6">
        <h2 className="text-xl font-semibold">Zones</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {zones.map((z) => (
            <span
              key={z.id}
              className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm"
            >
              {z.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
