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

function badgeClass(kind: "neutral" | "ok" | "warn") {
  // Uses subtle tokens that work on your dark portal background
  if (kind === "ok") return "bg-emerald-500/15 text-emerald-200 border-emerald-500/20";
  if (kind === "warn") return "bg-amber-500/15 text-amber-200 border-amber-500/20";
  return "bg-white/5 text-white/70 border-white/10";
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
    <div className="card p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="grid gap-3 md:grid-cols-3">
          <label className="grid gap-1">
            <span className="text-sm font-medium text-white/80">Date</span>
            <input
              type="date"
              className="h-10 rounded-xl border border-white/10 bg-white/5 px-3 text-white outline-none"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              onBlur={() => pushFilters(date, zone)}
            />
          </label>

          <label className="grid gap-1">
            <span className="text-sm font-medium text-white/80">Zone</span>
            <select
              className="h-10 rounded-xl border border-white/10 bg-white/5 px-3 text-white outline-none"
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
            <span className="text-sm font-medium text-white/80">Search</span>
            <input
              className="h-10 rounded-xl border border-white/10 bg-white/5 px-3 text-white outline-none placeholder:text-white/30"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Name, address, postcode"
            />
          </label>
        </div>

        <div className="text-sm text-white/70">
          {busy ? "Saving..." : `${rows.length} due`}
        </div>
      </div>

      <div className="mt-5 overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full min-w-[1000px] text-sm">
          <thead className="bg-white/5">
            <tr className="text-left text-white/70">
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
              const status = (v?.status || "pending") as
                | "pending"
                | "completed"
                | "skipped";

              return (
                <tr key={r.customer_id} className="border-t border-white/10">
                  <td className="py-4 px-4">
                    <div className="font-semibold text-white">
                      {r.full_name ?? "-"}
                    </div>
                    <div className="mt-1 text-xs text-white/60">
                      {r.zone_name} · Group {r.group_code}
                    </div>
                  </td>

                  <td className="py-4 px-4 text-white/70">{joinAddress(r)}</td>

                  <td className="py-4 px-4">
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-1 text-xs ${badgeClass(
                        "neutral"
                      )}`}
                    >
                      {r.bin_colour}
                    </span>
                  </td>

                  <td className="py-4 px-4">
                    {r.show_green ? (
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-1 text-xs ${badgeClass(
                          "neutral"
                        )}`}
                      >
                        Yes
                      </span>
                    ) : (
                      <span className="text-white/40">-</span>
                    )}
                  </td>

                  <td className="py-4 px-4">
                    {status === "completed" && (
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-1 text-xs ${badgeClass(
                          "ok"
                        )}`}
                      >
                        Completed
                      </span>
                    )}

                    {status === "skipped" && (
                      <div className="flex flex-col gap-1">
                        <span
                          className={`inline-flex w-fit items-center rounded-full border px-2 py-1 text-xs ${badgeClass(
                            "warn"
                          )}`}
                        >
                          Skipped
                        </span>
                        {v?.notes ? (
                          <span className="text-xs text-white/60">{v.notes}</span>
                        ) : null}
                      </div>
                    )}

                    {status === "pending" && (
                      <span className="text-white/60">Pending</span>
                    )}
                  </td>

                  <td className="py-4 px-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        className="inline-flex rounded-xl bg-[var(--brand)] px-3 py-2 text-xs font-semibold text-white hover:opacity-95 disabled:opacity-60"
                        disabled={busy}
                        onClick={() => upsertVisit(r, "completed")}
                      >
                        Complete
                      </button>

                      <button
                        className="inline-flex rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10 disabled:opacity-60"
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
              <tr className="border-t border-white/10">
                <td colSpan={6} className="py-10 px-4 text-white/70">
                  <div>No customers due for the selected filters.</div>
                  <div className="mt-2 text-xs text-white/50">
                    Tip: set Date to 2026-02-16 to test with your anchor week.
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-xs text-white/50">
        Completed writes a visit record for that due date. Skipped requires a note.
      </div>
    </div>
  );
}
