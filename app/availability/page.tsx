"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Zone = {
  id: string;
  name: string | null;
  capacity: number | null;
  active_customers: number | null;
  is_active: boolean |null;
};

type ZonePostcode = {
  postcode: string;
  zone_id: string;
};

function normalisePostcode(input: string) {
  return input.trim().toUpperCase().replace(/\s+/g, " ");
}

export default function AvailabilityPage() {
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

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);
      setZone(null);
      setZoneId(null);

      if (!postcode) {
        setLoading(false);
        setError("Missing postcode. Please go back and try again.");
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
        // If mapping exists but zone row doesn't, treat as not covered
        router.replace(`/waiting-list?postcode=${encodeURIComponent(postcode)}`);
        return;
      }

      // If zone is inactive, treat as not covered (or waiting list)
      if (z.is_active === false) {
        router.replace(
          `/waiting-list?postcode=${encodeURIComponent(postcode)}&zoneId=${encodeURIComponent(z.id)}`
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
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-2xl space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold">Check availability</h1>
          <p className="text-sm text-neutral-500">
            Postcode:{" "}
            <span className="font-medium text-neutral-200">
              {postcode || "Unknown"}
            </span>
          </p>
        </div>

        <div className="rounded-xl border p-5 space-y-3">
          {loading && <p className="text-sm">Checking your zone...</p>}

          {!loading && error && (
            <div className="space-y-3">
              <p className="text-sm">{error}</p>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={goWaitingList}
                  className="w-full rounded-lg bg-white text-black py-3 font-medium"
                >
                  Join waiting list
                </button>
                <button
                  onClick={goBack}
                  className="w-full rounded-lg border py-3 font-medium"
                >
                  Back
                </button>
              </div>
            </div>
          )}

          {!loading && !error && zone && (
            <div className="space-y-3">
              {available ? (
                <>
                  <p className="text-sm">
                    Good news. Your zone has availability. You can sign up now.
                  </p>
                  <p className="text-xs text-neutral-500">
                    Matched: {zone.name || "Zone"} · Capacity:{" "}
                    {zone.capacity ?? 0} · Active: {zone.active_customers ?? 0}
                  </p>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      onClick={goSignUp}
                      className="w-full rounded-lg bg-white text-black py-3 font-medium"
                    >
                      Sign up
                    </button>
                    <button
                      onClick={goBack}
                      className="w-full rounded-lg border py-3 font-medium"
                    >
                      Back
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm">
                    This zone is currently full. Join the waiting list and we’ll notify you
                    when space opens.
                  </p>
                  <p className="text-xs text-neutral-500">
                    Matched: {zone.name || "Zone"} · Capacity:{" "}
                    {zone.capacity ?? 0} · Active: {zone.active_customers ?? 0}
                  </p>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      onClick={goWaitingList}
                      className="w-full rounded-lg bg-white text-black py-3 font-medium"
                    >
                      Join waiting list
                    </button>
                    <button
                      onClick={goBack}
                      className="w-full rounded-lg border py-3 font-medium"
                    >
                      Back
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
