"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Zone = { id: string; name: string };

type DueRow = {
  customer_id: string;
  full_name: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  town: string | null;
  postcode: string | null;
  zone_id: string;
  zone_name: string;
  group_code: string;
  plan: "BIN" | "BIN_PLUS_GREEN";
  due_date: string;
  bin_colour: string;
  show_green: boolean;
  week_includes_green: boolean;

  visit_status?: "completed" | "skipped" | "pending" | null;
  completed_at?: string | null;
  notes?: string | null;
};

type VisitRow = {
  customer_id: string;
  due_date: string;
  status: "completed" | "skipped" | "pending" | null;
  completed_at: string | null;
  notes: string | null;
};

function joinAddress(r: DueRow) {
  return [r.address_line_1, r.address_line_2, r.town, r.postcode]
    .filter(Boolean)
    .join(", ");
}

export default function DueBoardClient({
  zones,
  initialDate,
  initialZone,
  initialRows,
  initialVisits,
}: {
  zones: Zone[];
  initialDate: string;
  initialZone: string;
  initialRows: DueRow[];
  initialVisits: VisitRow[];
}) {
  const router = useRouter();
  const sp = useSearchParams();

  const [date, setDate] = useState(initialDate);
  const [zone, setZone] = useState(initialZone);
  const [query, setQuery] = useState("");
  const [busy, startTransition] = useTransition();

  const visitMap = useMemo(() => {
    const m = new Map<string, VisitRow>();
    for (const v of initialVisits) {
      if (!v?.customer_id || !v?.due_date) continue;
      m.set(`${v.customer_id}:${v.due_date}`, v);
    }
    return m;
  }, [initialVisits]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return initialRows.filter((r) => {
      if (!q) return true;
      const blob = [r.full_name, joinAddress(r)].filter(Boolean).join(" ").toLowerCase();
      return blob.includes(q);
    });
  }, [initialRows, query]);

  function pushFilters(nextDate: string, nextZone: string) {
    const params = new URLSearchParams(sp?.toString() || "");
    params.set("date", nextDate);
    params.set("zone", nextZone);
    router.push(`/admin/due?${params.toString()}`);
  }

  async function upsertVisit(r: DueRow, status: "completed" | "skipped" | "pending") {
    let notes = "";
    if (status === "skipped") {
      notes = prompt("Reason for skip (required):", "Bin not out")?.trim() || "";
      if (notes.length < 2) return;
    }

    if (status === "pending") {
      const ok = confirm("Undo this and set back to Pending?");
      if (!ok) return;
    }

    startTransition(async () => {
      const res = await fetch("/api/admin/visits/upsert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: r.customer_id,
          due_date: r.due_date,
          zone_id: r.zone_id,
          bin_colour: r.bin_colour,
          status,
          notes: status === "skipped" ? notes : null,
        }),
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
    <div className="card p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="grid gap-3 md:grid-cols-3">
          <label className="grid gap-1">
            <span className="text-sm font-medium opacity-80">Date</span>
            <input
              type="date"
              className="input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              onBlur={() => pushFilters(date, zone)}
            />
          </label>

          <label className="grid gap-1">
            <span className="text-sm font-medium opacity-80">Zone</span>
            <select
              className="input"
              value={zone}
              onChange={(e) => {
                const z = e.target.value;
                setZone(z);
                pushFilters(date, z);
              }}
            >
              <option value="all">All</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1">
            <span className="text-sm font-medium opacity-80">Search</span>
            <input
              className="input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Name, address, postcode"
            />
          </label>
        </div>

        <div className="text-sm opacity-70">{busy ? "Saving..." : `${rows.length} due`}</div>
      </div>

      <div className="mt-5 overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full min-w-[1000px] text-sm">
          <thead className="bg-white/5">
            <tr className="text-left opacity-80">
              <th className="py-3 px-4">Customer</th>
              <th className="py-3 px-4">Address</th>
              <th className="py-3 px-4">Colour</th>
              <th className="py-3 px-4">Green</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((r) => {
              const v = visitMap.get(`${r.customer_id}:${r.due_date}`);
              const status =
                (r.visit_status || v?.status || "pending") as "pending" | "completed" | "skipped";
              const notes = r.notes ?? v?.notes ?? null;

              const canUndo = status === "completed" || status === "skipped";

              return (
                <tr key={r.customer_id} className="border-t border-white/10">
                  <td className="py-4 px-4">
                    <div className="font-semibold">{r.full_name ?? "-"}</div>
                    <div className="mt-1 text-xs opacity-60">
                      {r.zone_name} · Group {r.group_code}
                    </div>
                  </td>

                  <td className="py-4 px-4 opacity-80">{joinAddress(r)}</td>

                  <td className="py-4 px-4">
                    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs">
                      {r.bin_colour}
                    </span>
                  </td>

                  <td className="py-4 px-4">
                    {r.show_green ? (
                      <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs">
                        Yes
                      </span>
                    ) : (
                      <span className="opacity-50">-</span>
                    )}
                  </td>

                  <td className="py-4 px-4">
                    {status === "completed" && (
                      <span className="inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/15 px-2 py-1 text-xs text-emerald-200">
                        Completed
                      </span>
                    )}

                    {status === "skipped" && (
                      <div className="flex flex-col gap-1">
                        <span className="inline-flex w-fit items-center rounded-full border border-amber-500/20 bg-amber-500/15 px-2 py-1 text-xs text-amber-200">
                          Skipped
                        </span>
                        {notes ? <span className="text-xs opacity-60">{notes}</span> : null}
                      </div>
                    )}

                    {status === "pending" && <span className="opacity-70">Pending</span>}
                  </td>

                  <td className="py-4 px-4 text-right">
                    <div className="flex justify-end gap-2">
                      {!canUndo ? (
                        <>
                          <button
                            className="btn"
                            disabled={busy}
                            onClick={() => upsertVisit(r, "completed")}
                          >
                            Complete
                          </button>

                          <button
                            className="btn btn-secondary"
                            disabled={busy}
                            onClick={() => upsertVisit(r, "skipped")}
                          >
                            Skip
                          </button>
                        </>
                      ) : (
                        <button
                          className="btn btn-secondary"
                          disabled={busy}
                          onClick={() => upsertVisit(r, "pending")}
                        >
                          Undo
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}

            {rows.length === 0 && (
              <tr className="border-t border-white/10">
                <td colSpan={6} className="py-10 px-4 opacity-80">
                  <div>No customers due for the selected filters.</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
