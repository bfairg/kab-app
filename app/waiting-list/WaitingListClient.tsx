// app/waiting-list/WaitingListClient.tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function normalisePostcode(input: string) {
  return input.trim().toUpperCase().replace(/\s+/g, " ");
}

function normaliseUkMobile(input: string) {
  const digits = input.replace(/\D/g, "");
  if (digits.startsWith("44")) return `+${digits}`;
  if (digits.startsWith("0")) return `+44${digits.slice(1)}`;
  return null;
}

function isLikelyUkMobileE164(value: string) {
  return /^\+447\d{9}$/.test(value);
}

function isValidEmail(v: string) {
  const s = v.trim();
  return s.includes("@") && s.includes(".");
}

export default function WaitingListClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const postcode = useMemo(() => {
    const raw = searchParams.get("postcode") || "";
    return normalisePostcode(raw);
  }, [searchParams]);

  const zoneId = useMemo(() => {
    return (searchParams.get("zoneId") || "").trim();
  }, [searchParams]);

  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    const normalisedMobile = normaliseUkMobile(mobile);

    if (!postcode) {
      setError("Missing postcode. Please go back and try again.");
      return;
    }

    if (!cleanEmail || !isValidEmail(cleanEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!normalisedMobile || !isLikelyUkMobileE164(normalisedMobile)) {
      setError("Please enter a valid UK mobile number (07… format).");
      return;
    }

    setSubmitting(true);

    const { error: dbError } = await supabase.from("waiting_list").insert({
      postcode,
      zone_id: zoneId || null,
      email: cleanEmail,
      mobile: normalisedMobile,
    });

    setSubmitting(false);

    if (dbError) {
      setError(dbError.message);
      return;
    }

    setSuccess(true);
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
                  Waiting list
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
            Join the waiting list
          </h1>

          <p className="mt-3 text-sm text-white/70">
            Postcode:{" "}
            <span className="font-semibold text-white/85">
              {postcode || "Unknown"}
            </span>
          </p>

          <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.04] shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
            <div className="p-6">
              {!success ? (
                <div className="space-y-4">
                  <p className="text-sm text-white/70">
                    Leave your mobile and email and we’ll contact you when space
                    is available.
                  </p>

                  <div>
                    <label className="mb-1 block text-xs text-white/70">
                      Mobile number
                    </label>
                    <input
                      className={cx(
                        "w-full rounded-xl border bg-black/20 px-3 py-2.5 text-sm outline-none",
                        "placeholder:text-white/35 focus:ring-2 focus:ring-cyan-400/25",
                        "border-white/10 focus:border-cyan-400/50"
                      )}
                      placeholder="07xxx xxxxxx"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      inputMode="tel"
                      autoComplete="tel"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") submit();
                      }}
                    />
                    <p className="mt-2 text-[11px] text-white/50">
                      Service updates only.
                    </p>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs text-white/70">
                      Email
                    </label>
                    <input
                      className={cx(
                        "w-full rounded-xl border bg-black/20 px-3 py-2.5 text-sm outline-none",
                        "placeholder:text-white/35 focus:ring-2 focus:ring-cyan-400/25",
                        "border-white/10 focus:border-cyan-400/50"
                      )}
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      inputMode="email"
                      autoComplete="email"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") submit();
                      }}
                    />
                  </div>

                  {error && (
                    <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-100">
                      {error}
                    </div>
                  )}

                  <button
                    onClick={submit}
                    disabled={submitting}
                    className={cx(
                      "relative inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold transition",
                      "bg-gradient-to-r from-cyan-400 to-sky-500 text-black",
                      "hover:brightness-110 active:brightness-95",
                      "disabled:cursor-not-allowed disabled:opacity-60"
                    )}
                  >
                    {submitting && (
                      <span className="absolute left-3 inline-flex h-4 w-4 animate-spin rounded-full border-2 border-black/40 border-t-black" />
                    )}
                    {submitting ? "Saving..." : "Join waiting list"}
                  </button>

                  <div className="text-xs text-white/55">
                    We’ll only use your details for availability updates and
                    onboarding.
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 p-4">
                    <div className="text-sm font-semibold">All set</div>
                    <div className="mt-1 text-xs text-white/70">
                      You’re on the waiting list. We’ll be in touch when space
                      opens.
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => router.push("/")}
                      className={cx(
                        "w-full rounded-xl px-4 py-3 text-sm font-semibold transition sm:w-auto",
                        "bg-gradient-to-r from-cyan-400 to-sky-500 text-black",
                        "hover:brightness-110 active:brightness-95"
                      )}
                    >
                      Back to home
                    </button>

                    <button
                      type="button"
                      onClick={() => router.push("/address")}
                      className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white/85 hover:bg-white/[0.07] sm:w-auto"
                    >
                      Check another postcode
                    </button>
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
