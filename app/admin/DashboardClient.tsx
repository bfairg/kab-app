"use client";

import Link from "next/link";
import type { CustomerRow, ZoneRow } from "./page";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
function pct(active: number, capacity: number) {
  if (!capacity || capacity <= 0) return 0;
  return clamp((active / capacity) * 100, 0, 100);
}

function fmtDate(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB");
}

function Donut({
  percent,
  title,
  subtitle,
}: {
  percent: number;
  title: string;
  subtitle: string;
}) {
  const bg = `conic-gradient(rgba(11,181,193,0.95) ${percent}%, rgba(255,255,255,0.10) 0)`;
  return (
    <div className="flex items-center gap-4">
      <div className="relative h-16 w-16 rounded-full" style={{ background: bg }}>
        <div className="absolute inset-[7px] rounded-full bg-[#0b0f16] border border-white/10" />
      </div>
      <div className="min-w-0">
        <div className="text-sm font-semibold">{title}</div>
        <div className="mt-1 text-xs opacity-70">{subtitle}</div>
      </div>
    </div>
  );
}

function CustomerMiniTable({
  title,
  subtitle,
  rows,
  emptyText,
  errorText,
  cta,
}: {
  title: string;
  subtitle: string;
  rows: CustomerRow[];
  emptyText: string;
  errorText?: string | null;
  cta?: { href: string; label: string };
}) {
  return (
    <div className="card p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className="mt-1 text-sm opacity-70">{subtitle}</p>
        </div>
        {cta ? (
          <Link href={cta.href} className="btn btn-secondary">
            {cta.label}
          </Link>
        ) : null}
      </div>

      {errorText ? (
        <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {errorText}
        </div>
      ) : null}

      <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
        <table className="min-w-[900px] w-full text-sm">
          <thead className="bg-white/5 text-left">
            <tr className="border-b border-white/10">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Zone</th>
              <th className="px-4 py-3">Group</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Address</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-4 opacity-70" colSpan={7}>
                  {emptyText}
                </td>
              </tr>
            ) : (
              rows.map((c) => (
                <tr key={c.id} className="border-b border-white/10 last:border-b-0">
                  <td className="px-4 py-3 font-medium">{c.full_name || "-"}</td>
                  <td className="px-4 py-3">{c.zone_name || "-"}</td>
                  <td className="px-4 py-3">{c.group_code || "-"}</td>
                  <td className="px-4 py-3">{c.plan || "-"}</td>
                  <td className="px-4 py-3">{c.status || "-"}</td>
                  <td className="px-4 py-3">{fmtDate(c.created_at)}</td>
                  <td className="px-4 py-3 opacity-80">
                    {[c.address_line_1, c.town, c.postcode].filter(Boolean).join(", ") || "-"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function DashboardClient({
  zones,
  recentSignups,
  missingGroup,
  errors,
}: {
  zones: ZoneRow[];
  recentSignups: CustomerRow[];
  missingGroup: CustomerRow[];
  errors?: { recentSignups?: string | null; missingGroup?: string | null };
}) {
  const zoneCards = (zones ?? []).map((z) => {
    const cap = Number(z.capacity ?? 0);
    const active = Number(z.active_customers ?? 0);
    const available = Math.max(0, cap - active);
    const percent = pct(active, cap);

    return {
      id: z.id,
      name: z.name || "Unnamed zone",
      cap,
      active,
      available,
      percent,
    };
  });

  const totalCap = zoneCards.reduce((a, r) => a + r.cap, 0);
  const totalActive = zoneCards.reduce((a, r) => a + r.active, 0);
  const totalAvail = Math.max(0, totalCap - totalActive);

  return (
    <div className="grid gap-6">
      <div className="card p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Zone availability</h2>
            <p className="mt-1 text-sm opacity-70">
              Active customers vs available capacity per zone.
            </p>
          </div>

          <div className="text-sm opacity-80">
            <span className="font-semibold">{totalActive}</span> active
            <span className="opacity-60"> / </span>
            <span className="font-semibold">{totalCap}</span> capacity
            <span className="opacity-60"> (</span>
            <span className="font-semibold">{totalAvail}</span> available
            <span className="opacity-60">)</span>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {zoneCards.map((z) => (
            <div key={z.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <Donut
                percent={z.percent}
                title={z.name}
                subtitle={`${z.active} active, ${z.available} available (of ${z.cap})`}
              />

              <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                <div className="rounded-xl border border-white/10 bg-black/20 p-2">
                  <div className="opacity-70">Active</div>
                  <div className="mt-1 text-sm font-semibold">{z.active}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 p-2">
                  <div className="opacity-70">Available</div>
                  <div className="mt-1 text-sm font-semibold">{z.available}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 p-2">
                  <div className="opacity-70">Capacity</div>
                  <div className="mt-1 text-sm font-semibold">{z.cap}</div>
                </div>
              </div>

              <div className="mt-3 text-xs opacity-70">
                Teal slice = active customers. Grey = spare capacity.
              </div>
            </div>
          ))}
        </div>
      </div>

      <CustomerMiniTable
        title="Recent signups"
        subtitle="Latest customers added to the system."
        rows={recentSignups}
        emptyText="No recent signups found."
        errorText={errors?.recentSignups ?? null}
        cta={{ href: "/admin/customers", label: "View all" }}
      />

      <CustomerMiniTable
        title="Missing group code"
        subtitle="Active customers who still need Group A/B assigning."
        rows={missingGroup}
        emptyText="No active customers missing group codes."
        errorText={errors?.missingGroup ?? null}
        cta={{ href: "/admin/customers", label: "Open customers" }}
      />
    </div>
  );
}
