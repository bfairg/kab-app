"use client";

type ZoneSummaryRow = {
  zone_id: string;
  zone_name: string;
  capacity: number;
  active_customers: number;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function pct(active: number, capacity: number) {
  if (!capacity || capacity <= 0) return 0;
  return clamp((active / capacity) * 100, 0, 100);
}

function Donut({
  percent,
  label,
}: {
  percent: number; // 0..100
  label: string;
}) {
  // Uses your brand teal + subtle white ring
  const bg = `conic-gradient(rgba(11,181,193,0.95) ${percent}%, rgba(255,255,255,0.10) 0)`;

  return (
    <div className="flex items-center gap-4">
      <div
        className="relative h-16 w-16 rounded-full"
        style={{ background: bg }}
        aria-label={label}
        title={label}
      >
        <div className="absolute inset-[7px] rounded-full bg-[#0b0f16] border border-white/10" />
      </div>
      <div className="min-w-0">
        <div className="text-sm font-semibold">{label}</div>
        <div className="mt-1 text-xs opacity-70">{Math.round(percent)}% utilised</div>
      </div>
    </div>
  );
}

export default function DashboardClient({ zoneSummary }: { zoneSummary: ZoneSummaryRow[] }) {
  const rows = (zoneSummary ?? []).map((z) => {
    const cap = Number(z.capacity ?? 0);
    const active = Number(z.active_customers ?? 0);
    const available = Math.max(0, cap - active);
    return {
      ...z,
      capacity: cap,
      active_customers: active,
      available,
      percent: pct(active, cap),
    };
  });

  const totalCapacity = rows.reduce((a, r) => a + r.capacity, 0);
  const totalActive = rows.reduce((a, r) => a + r.active_customers, 0);
  const totalAvailable = Math.max(0, totalCapacity - totalActive);

  return (
    <div className="grid gap-6">
      <div className="card p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Zone capacity</h2>
            <p className="mt-1 text-sm opacity-70">
              Active customers vs available slots per zone.
            </p>
          </div>

          <div className="text-sm opacity-80">
            <span className="font-semibold">{totalActive}</span> active
            <span className="opacity-60"> / </span>
            <span className="font-semibold">{totalCapacity}</span> capacity
            <span className="opacity-60"> (</span>
            <span className="font-semibold">{totalAvailable}</span> available
            <span className="opacity-60">)</span>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {rows.map((z) => (
            <div key={z.zone_id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <Donut percent={z.percent} label={z.zone_name} />

              <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                <div className="rounded-xl border border-white/10 bg-black/20 p-2">
                  <div className="opacity-70">Active</div>
                  <div className="mt-1 text-sm font-semibold">{z.active_customers}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 p-2">
                  <div className="opacity-70">Available</div>
                  <div className="mt-1 text-sm font-semibold">{z.available}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 p-2">
                  <div className="opacity-70">Capacity</div>
                  <div className="mt-1 text-sm font-semibold">{z.capacity}</div>
                </div>
              </div>

              <div className="mt-3 text-xs opacity-70">
                Teal = active customers, grey = availability.
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
