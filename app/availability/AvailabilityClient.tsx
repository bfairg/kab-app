// app/availability/AvailabilityClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
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

  const spacesLeft = useMemo(() => {
    if (!zone) return 0;
    if (zone.is_active === false) return 0;
    const cap = Math.max(zone.capacity ?? 0, 0);
    const active = Math.max(zone.active_customers ?? 0, 0);
    return Math.max(0, cap - active);
  }, [zone]);

  const available = useMemo(() => spacesLeft > 0, [spacesLeft]);

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

      // 2) Fetch zone details
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
      {/* Background accents (quieter) */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-56 left-1/2 h-[420px] w-[680px] -translate-x-1/2 rounded-full bg-gradient-to-r from-sky-500/14 via-cyan-400/8 to-blue-600/14 blur-3xl" />
        <div className="absolute -bottom-52 right-[-160px] h-[380px] w-[520px] rounded-full bg-gradient-to-tr from-blue-600/14 via-cyan-400/8 to-sky-400/8 blur-3xl" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.05] via-transparent to-transparent" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-xl items-center px-6 py-12">
        <div className="w-full">
          {/* Header */}
          <header className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/5">
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
                <div className="text-xl font-semibold tracking-tight">
                  Availability
                </div>
              </div>
            </div>

            <Link
              href="/address"
              className="text-xs text-white/60 hover:text-white/80"
            >
              Back
            </Link>
          </header>

          <h1 className="mt-10 text-3xl font-semibold tracking-tight sm:text-4xl">
            Availability check
          </h1>

          <p className="mt-3 text-sm text-white/70">
            Postcode:{" "}
            <span className="font-semibold text-white/85">
              {postcode || "Unknown"}
            </span>
          </p>

          {/* Main card */}
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.04] shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
            <div className="p-6">
              {/* Loading */}
              {loading && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 animate-spin rounded-full border-2 border-white/20 border-t-cyan-300" />
                    <div>
                      <div className="text-sm font-semibold">
                        Checking availability
                      </div>
                      <div className="mt-1 text-xs text-white/60">
                        This normally takes a few seconds.
                      </div>
                    </div>
                  </div>
                  <div className="h-2 w-full rounded-full bg-white/10" />
                </div>
              )}

              {/* Error */}
              {!loading && error && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                    <div className="text-sm font-semibold text-red-100">
                      We could not check your zone
                    </div>
                    <div className="mt-1 text-xs text-red-100/80">{error}</div>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      onClick={goBack}
                      className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white/85 hover:bg-white/[0.07]"
                    >
                      Try again
                    </button>

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
                  </div>
                </div>
              )}

              {/* Success */}
              {!loading && !error && zone && (
                <div className="space-y-4">
                  <div
                    className={cx(
                      "rounded-xl border p-4",
                      available
                        ? "border-cyan-400/30 bg-cyan-400/10"
                        : "border-white/10 bg-black/20"
                    )}
                  >
                    <div className="text-sm font-semibold">
                      {available
                        ? `${spacesLeft} space${spacesLeft === 1 ? "" : "s"} available`
                        : "Currently full"}
                    </div>

                    <div className="mt-1 text-xs text-white/70">
                      {available
                        ? "Continue to sign up to secure your place."
                        : "Join the waiting list and we’ll let you know when space opens."}
                    </div>

                    <div className="mt-3 text-xs text-white/60">
                      Matched zone:{" "}
                      <span className="font-semibold text-white/80">
                        {zone.name || "Zone"}
                      </span>
                    </div>
                  </div>

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

                  <div className="text-xs text-white/50">
                    If you believe your postcode should be covered, join the
                    waiting list and we’ll review it.
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 text-center text-xs text-white/40">
            KAB Group. Reliable service, minimal hassle.
          </div>
        </div>
      </div>
    </main>
  );
}
