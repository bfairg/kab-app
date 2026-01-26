// app/availability/AvailabilityClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Zone = {
  id: string;
  name: string | null;
  capacity: number | null;
  active_customers: number | null;
  is_active: boolean | null;
};

type ZonePostcode = {
  postcode: string;
  zone_id: string;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function normalisePostcode(input: string) {
  return input.trim().toUpperCase().replace(/\s+/g, " ");
}

function isLikelyPostcode(v: string) {
  const s = v.trim().replace(/\s+/g, "");
  return s.length >= 5 && s.length <= 8;
}

export default function AvailabilityClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const postcode = useMemo(() => {
    const raw = searchParams.get("postcode") || "";
    return normalisePostcode(raw);
  }, [searchParams]);

  const [loading, setLoading] = useState(true);
  const [zone, setZone] = useState<Zone | null>(null);
  const [zoneId, setZoneId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const available = useMemo(() => {
    if (!zone) return false;
    if (zone.is_active === false) return false;
    const cap = zone.capacity ?? 0;
    const active = zone.active_customers ?? 0;
    return active < cap;
  }, [zone]);

  const progress = useMemo(() => {
    if (!zone) return { pct: 0, label: "Checking..." };
    const cap = Math.max(zone.capacity ?? 0, 0);
    const active = Math.max(zone.active_customers ?? 0, 0);
    if (cap <= 0) return { pct: 0, label: "Capacity not set" };
    const pct = Math.min(100, Math.round((active / cap) * 100));
    return { pct, label: `${active} of ${cap} spaces used` };
  }, [zone]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);
      setZone(null);
      setZoneId(null);

      if (!postcode || !isLikelyPostcode(postcode)) {
        setLoading(false);
        setError("Missing or invalid postcode. Please go back and try again.");
        return;
      }

      // 1) Look up postcode -> zone_id
      const { data: zp, error: zpError } = await supabase
        .from("zone_postcodes")
        .select("postcode,zone_id")
        .eq("postcode", postcode)
        .limit(1)
        .maybeSingle<ZonePostcode>();

      if (cancelled) return;

      if (zpError) {
        setError(zpError.message);
        setLoading(false);
        return;
      }

      // Not covered -> send to waiting list immediately
      if (!zp?.zone_id) {
        router.replace(`/waiting-list?postcode=${encodeURIComponent(postcode)}`);
        return;
      }

      setZoneId(zp.zone_id);

      // 2) Fetch zone details (capacity, name, active customers)
      const { data: z, error: zError } = await supabase
        .from("zones")
        .select("id,name,capacity,active_customers,is_active")
        .eq("id", zp.zone_id)
        .limit(1)
        .maybeSingle<Zone>();

      if (cancelled) return;

      if (zError) {
        setError(zError.message);
        setLoading(false);
        return;
      }

      if (!z) {
        router.replace(`/waiting-list?postcode=${encodeURIComponent(postcode)}`);
        return;
      }

      if (z.is_active === false) {
        router.replace(
          `/waiting-list?postcode=${encodeURIComponent(postcode)}&zoneId=${encodeURIComponent(
            z.id
          )}`
        );
        return;
      }

      setZone(z);
      setLoading(false);
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [postcode, router]);

  function goBack() {
    router.push("/address");
  }

  function goSignUp() {
    if (!zoneId) return;
    router.push(
      `/signup?postcode=${encodeURIComponent(postcode)}&zoneId=${encodeURIComponent(zoneId)}`
    );
  }

  function goWaitingList() {
    router.push(
      `/waiting-list?postcode=${encodeURIComponent(postcode)}${
        zoneId ? `&zoneId=${encodeURIComponent(zoneId)}` : ""
      }`
    );
  }

  return (
    <main className="min-h-screen bg-[#070A0F] text-white">
      {/* Background accents */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-48 left-1/2 h-[520px] w-[780px] -translate-x-1/2 rounded-full bg-gradient-to-r from-sky-500/20 via-cyan-400/10 to-blue-600/20 blur-3xl" />
        <div className="absolute -bottom-40 right-[-120px] h-[420px] w-[520px] rounded-full bg-gradient-to-tr from-blue-600/20 via-cyan-400/10 to-sky-400/10 blur-3xl" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.06] via-transparent to-transparent" />
      </div>

      <div className="relative mx-auto w-full max-w-6xl px-6 py-10">
        {/* Header */}
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/5">
              {/* Optional logo: add file to /public/kab-logo.png */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/kab-logo.png"
                alt="KAB Group"
                className="hidden h-full w-full object-cover"
              />
              <span className="text-xs font-semibold text-white/70">KAB</span>
            </div>
            <div className="leading-tight">
              <div className="text-sm text-white/70">KAB Group</div>
              <div className="text-xl font-semibold tracking-tight">Availability</div>
            </div>
          </div>

          <button
            type="button"
            onClick={goBack}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/[0.07]"
          >
            ← Back
          </button>
        </header>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left: context */}
          <section className="lg:col-span-5">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
              <div className="text-sm font-semibold">Checking zone for</div>
              <div className="mt-2 rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="text-xs text-white/60">Postcode</div>
                <div className="mt-1 text-lg font-semibold tracking-tight">
                  {postcode || "Unknown"}
                </div>
              </div>

              <div className="mt-4 space-y-2 text-xs text-white/60">
                <p>
                  We match your postcode to the nearest service zone and check whether there is capacity for new
                  subscriptions.
                </p>
                <p>If your zone is full, you can join the waiting list and we’ll notify you when space opens.</p>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 text-xs text-white/70">
                <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <div className="font-semibold text-white/85">Fast</div>
                  <div className="mt-1 text-white/60">Instant lookup</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <div className="font-semibold text-white/85">Fair</div>
                  <div className="mt-1 text-white/60">Capacity based</div>
                </div>
              </div>
            </div>
          </section>

          {/* Right: result */}
          <section className="lg:col-span-7">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
              <div className="border-b border-white/10 p-6">
                <div className="text-sm font-semibold">Result</div>
                <div className="mt-1 text-xs text-white/60">
                  {loading
                    ? "Checking your zone..."
                    : error
                    ? "We hit a problem"
                    : available
                    ? "Space available"
                    : "Zone currently full"}
                </div>
              </div>

              <div className="p-6">
                {/* Loading */}
                {loading && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 animate-spin rounded-full border-2 border-white/20 border-t-cyan-300" />
                      <div>
                        <div className="text-sm font-semibold">Checking availability</div>
                        <div className="mt-1 text-xs text-white/60">Matching your postcode to a zone</div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                      <div className="h-2 w-full rounded-full bg-white/10" />
                      <div className="mt-2 text-xs text-white/50">This normally takes a few seconds.</div>
                    </div>
                  </div>
                )}

                {/* Error */}
                {!loading && error && (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                      <div className="text-sm font-semibold text-red-100">We could not check your zone</div>
                      <div className="mt-1 text-xs text-red-100/80">{error}</div>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <button
                        onClick={goWaitingList}
                        className={cx(
                          "w-full rounded-xl px-4 py-3 text-sm font-semibold transition sm:w-auto",
                          "bg-gradient-to-r from-cyan-400 to-sky-500 text-black",
                          "hover:brightness-110 active:brightness-95"
                        )}
                      >
                        Join waiting list
                      </button>
                      <button
                        onClick={goBack}
                        className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white/85 hover:bg-white/[0.07]"
                      >
                        Back
                      </button>
                    </div>
                  </div>
                )}

                {/* Success */}
                {!loading && !error && zone && (
                  <div className="space-y-4">
                    {/* Status banner */}
                    <div
                      className={cx(
                        "rounded-xl border p-4",
                        available ? "border-cyan-400/30 bg-cyan-400/10" : "border-white/10 bg-black/20"
                      )}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-sm font-semibold">
                            {available ? "Good news. You can sign up now." : "This zone is currently full."}
                          </div>
                          <div className="mt-1 text-xs text-white/70">
                            {available
                              ? "There is space in your zone for new subscriptions."
                              : "Join the waiting list and we’ll notify you when space opens."}
                          </div>
                        </div>

                        <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-right">
                          <div className="text-[11px] text-white/60">Matched</div>
                          <div className="text-xs font-semibold text-white/85">{zone.name || "Zone"}</div>
                        </div>
                      </div>
                    </div>

                    {/* Capacity meter */}
                    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                      <div className="flex items-center justify-between text-xs text-white/70">
                        <span>Capacity</span>
                        <span className="text-white/85">{progress.label}</span>
                      </div>
                      <div className="mt-2 h-2 w-full rounded-full bg-white/10">
                        <div
                          className="h-2 rounded-full bg-gradient-to-r from-cyan-400 to-sky-500"
                          style={{ width: `${progress.pct}%` }}
                        />
                      </div>
                      <div className="mt-2 text-[11px] text-white/50">
                        Capacity: {zone.capacity ?? 0} · Active: {zone.active_customers ?? 0}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-3 sm:flex-row">
                      {available ? (
                        <button
                          onClick={goSignUp}
                          className={cx(
                            "w-full rounded-xl px-4 py-3 text-sm font-semibold transition sm:w-auto",
                            "bg-gradient-to-r from-cyan-400 to-sky-500 text-black",
                            "hover:brightness-110 active:brightness-95"
                          )}
                        >
                          Continue to sign up
                        </button>
                      ) : (
                        <button
                          onClick={goWaitingList}
                          className={cx(
                            "w-full rounded-xl px-4 py-3 text-sm font-semibold transition sm:w-auto",
                            "bg-gradient-to-r from-cyan-400 to-sky-500 text-black",
                            "hover:brightness-110 active:brightness-95"
                          )}
                        >
                          Join waiting list
                        </button>
                      )}

                      <button
                        onClick={goBack}
                        className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white/85 hover:bg-white/[0.07]"
                      >
                        Back
                      </button>
                    </div>

                    {/* Small note */}
                    <div className="text-xs text-white/50">
                      If you believe your postcode should be covered, join the waiting list and we’ll review it.
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 text-center text-xs text-white/40">
              KAB Group. Reliable service, minimal hassle.
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
