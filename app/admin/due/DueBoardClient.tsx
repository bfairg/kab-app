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
  due_date: string; // YYYY-MM-DD
  bin_colour: string;
  show_green: boolean;
  week_includes_green: boolean;
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

  async function upsertVisit(r: DueRow, status: "completed" | "skipped") {
    let notes = "";
    if (status === "skipped") {
      notes = prompt("Reason for skip (required):", "Bin not out")?.trim() || "";
      if (notes.length < 2) return;
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
          notes,
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
    <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="grid gap-3 md:grid-cols-3">
          <label className="grid gap-1">
            <span className="text-sm font-medium">Date</span>
            <input
              type="date"
              className="h-10 rounded-xl border border-black/15 px-3"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              onBlur={() => pushFilters(date, zone)}
            />
          </label>

          <label className="grid gap-1">
            <span className="text-sm font-medium">Zone</span>
            <select
              className="h-10 rounded-xl border border-black/15 px-3"
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
            <span className="text-sm font-medium">Search</span>
            <input
              className="h-10 rounded-xl border border-black/15 px-3"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Name, address, postcode"
            />
          </label>
        </div>

        <div className="text-sm text-black/70">
          {busy ? "Saving..." : `${rows.length} due`}
        </div>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[1000px] text-sm">
          <thead>
            <tr className="border-b border-black/10 text-left">
              <th className="py-2 pr-3">Customer</th>
              <th className="py-2 pr-3">Address</th>
              <th className="py-2 pr-3">Colour</th>
              <th className="py-2 pr-3">Green</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2 pr-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const v = visitMap.get(`${r.customer_id}:${r.due_date}`);
              const status = (v?.status || "pending") as
                | "pending"
                | "completed"
                | "skipped";

              return (
                <tr key={r.customer_id} className="border-b border-black/5">
                  <td className="py-3 pr-3 font-medium">
                    <div>{r.full_name ?? "-"}</div>
                    <div className="text-xs text-black/60">
                      {r.zone_name} · Group {r.group_code}
                    </div>
                  </td>

                  <td className="py-3 pr-3 text-black/70">{joinAddress(r)}</td>

                  <td className="py-3 pr-3">
                    <span className="rounded-full bg-black/5 px-2 py-1">
                      {r.bin_colour}
                    </span>
                  </td>

                  <td className="py-3 pr-3">
                    {r.show_green ? (
                      <span className="rounded-full bg-black/5 px-2 py-1">
                        Yes
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>

                  <td className="py-3 pr-3">
                    {status === "completed" && (
                      <span className="rounded-full bg-black/5 px-2 py-1">
                        Completed
                      </span>
                    )}
                    {status === "skipped" && (
                      <span className="rounded-full bg-black/5 px-2 py-1">
                        Skipped{v?.notes ? `: ${v.notes}` : ""}
                      </span>
                    )}
                    {status === "pending" && (
                      <span className="text-black/60">Pending</span>
                    )}
                  </td>

                  <td className="py-3 pr-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        className="rounded-xl border border-black/15 px-3 py-2 font-semibold hover:bg-black/5 disabled:opacity-60"
                        disabled={busy}
                        onClick={() => upsertVisit(r, "completed")}
                      >
                        Complete
                      </button>

                      <button
                        className="rounded-xl border border-black/15 px-3 py-2 font-semibold hover:bg-black/5 disabled:opacity-60"
                        disabled={busy}
                        onClick={() => upsertVisit(r, "skipped")}
                      >
                        Skip
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-black/60">
                  No customers due for the selected filters.
                  <div className="mt-1 text-xs">
                    Tip: set Date to 2026-02-16 to test with your anchor week.
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
