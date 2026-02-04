"use client";

import type { ZoneSummaryRow } from "./page";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function pct(part: number, total: number) {
  if (!total || total <= 0) return 0;
  return clamp((part / total) * 100, 0, 100);
}

function Donut({
  percent,
  label,
  sublabel,
}: {
  percent: number;
  label: string;
  sublabel: string;
}) {
  // Teal = “good” slice, grey = remainder
  const bg = `conic-gradient(rgba(11,181,193,0.95) ${percent}%, rgba(255,255,255,0.10) 0)`;

  return (
    <div className="flex items-center gap-4">
      <div className="relative h-16 w-16 rounded-full" style={{ background: bg }}>
        <div className="absolute inset-[7px] rounded-full bg-[#0b0f16] border border-white/10" />
      </div>
      <div className="min-w-0">
        <div className="text-sm font-semibold">{label}</div>
        <div className="mt-1 text-xs opacity-70">{sublabel}</div>
      </div>
    </div>
  );
}

export default function DashboardClient({ zoneSummary }: { zoneSummary: ZoneSummaryRow[] }) {
  const rows = (zoneSummary ?? []).map((z) => {
    const signups = Number(z.signups_total ?? 0);
    const active = Number(z.active_payers ?? 0);
    const pending = Number(z.pending_payers ?? 0);
    const failed = Number(z.failed_payers ?? 0);
    const cancelled = Number(z.cancelled_payers ?? 0);

    const activePct = pct(active, signups);

    return {
      ...z,
      signups,
      active,
      pending,
      failed,
      cancelled,
      activePct,
    };
  });

  const totals = rows.reduce(
    (acc, r) => {
      acc.signups += r.signups;
      acc.active += r.active;
      acc.pending += r.pending;
      acc.failed += r.failed;
      acc.cancelled += r.cancelled;
      return acc;
    },
    { signups: 0, active: 0, pending: 0, failed: 0, cancelled: 0 }
  );

  const overallActivePct = pct(totals.active, totals.signups);

  return (
    <div className="grid gap-6">
      <div className="card p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Zone overview</h2>
            <p className="mt-1 text-sm opacity-70">
              Active payer ratio and payment-status breakdown per zone.
            </p>
          </div>

          <div className="text-sm opacity-80">
            <span className="font-semibold">{totals.active}</span> active payers
            <span className="opacity-60"> / </span>
            <span className="font-semibold">{totals.signups}</span> signups
            <span className="opacity-60"> (</span>
            {Math.round(overallActivePct)}
            <span className="opacity-60">% active)</span>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {rows.map((z) => (
            <div key={z.zone_id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <Donut
                percent={z.activePct}
                label={z.zone_name}
                sublabel={`${z.active} active of ${z.signups} signups (${Math.round(z.activePct)}%)`}
              />

              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl border border-white/10 bg-black/20 p-2">
                  <div className="opacity-70">Active</div>
                  <div className="mt-1 text-sm font-semibold">{z.active}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 p-2">
                  <div className="opacity-70">Pending</div>
                  <div className="mt-1 text-sm font-semibold">{z.pending}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 p-2">
                  <div className="opacity-70">Failed</div>
                  <div className="mt-1 text-sm font-semibold">{z.failed}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 p-2">
                  <div className="opacity-70">Cancelled</div>
                  <div className="mt-1 text-sm font-semibold">{z.cancelled}</div>
                </div>
              </div>

              <div className="mt-3 text-xs opacity-70">
                Teal slice = active payers. Remainder = not active.
              </div>
            </div>
          ))}

          {rows.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm opacity-70">
              No zone summary data found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
