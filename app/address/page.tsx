// app/address/page.tsx

"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function isLikelyPostcode(v: string) {
  const s = v.trim().replace(/\s+/g, "");
  return s.length >= 5 && s.length <= 8;
}

export default function AddressPage() {
  const router = useRouter();

  const [address1, setAddress1] = useState("");
  const [postcode, setPostcode] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const validation = useMemo(() => {
    const aOk = address1.trim().length >= 4;
    const pOk = isLikelyPostcode(postcode);
    const missing: string[] = [];
    if (!aOk) missing.push("Address line 1");
    if (!pOk) missing.push("Postcode");
    return { ok: aOk && pOk, missing, aOk, pOk };
  }, [address1, postcode]);

  function next() {
    setSubmitted(true);
    setError(null);

    if (!validation.ok) {
      setError(`Please enter: ${validation.missing.join(" and ")}.`);
      return;
    }

    router.push(
      `/availability?address1=${encodeURIComponent(address1.trim())}&postcode=${encodeURIComponent(
        postcode.trim()
      )}`
    );
  }

  const aInvalid = submitted && !validation.aOk;
  const pInvalid = submitted && !validation.pOk;

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
                <div className="text-xl font-semibold tracking-tight">
                  Check availability
                </div>
              </div>
            </div>

            <Link
              href="/"
              className="text-xs text-white/60 hover:text-white/80"
            >
              Back
            </Link>
          </header>

          {/* Copy */}
          <h1 className="mt-10 text-3xl font-semibold tracking-tight sm:text-4xl">
            Tell us where you are
          </h1>

          <p className="mt-3 text-sm text-white/70">
            We’ll use your address to find your zone and check current capacity.
          </p>

          {/* Form card */}
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.04] shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
            <div className="p-6">
              <div className="grid gap-4">
                <div>
                  <label className="mb-1 block text-xs text-white/70">
                    Address line 1
                  </label>
                  <input
                    className={cx(
                      "w-full rounded-xl border bg-black/20 px-3 py-2.5 text-sm outline-none",
                      "placeholder:text-white/35 focus:ring-2 focus:ring-cyan-400/25",
                      aInvalid
                        ? "border-red-500/40 focus:border-red-500/60"
                        : "border-white/10 focus:border-cyan-400/50"
                    )}
                    placeholder=""
                    value={address1}
                    onChange={(e) => setAddress1(e.target.value)}
                    autoComplete="address-line1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") next();
                    }}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs text-white/70">
                    Postcode
                  </label>
                  <input
                    className={cx(
                      "w-full rounded-xl border bg-black/20 px-3 py-2.5 text-sm uppercase outline-none",
                      "placeholder:text-white/35 focus:ring-2 focus:ring-cyan-400/25",
                      pInvalid
                        ? "border-red-500/40 focus:border-red-500/60"
                        : "border-white/10 focus:border-cyan-400/50"
                    )}
                    placeholder=""
                    value={postcode}
                    onChange={(e) => setPostcode(e.target.value.toUpperCase())}
                    autoComplete="postal-code"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") next();
                    }}
                  />

                  <p className="mt-2 text-[11px] text-white/50">
                    We only need the first line and postcode.
                  </p>
                </div>

                {error && (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-100">
                    {error}
                  </div>
                )}

                <button
                  type="button"
                  onClick={next}
                  className={cx(
                    "inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold transition",
                    "bg-gradient-to-r from-cyan-400 to-sky-500 text-black",
                    "hover:brightness-110 active:brightness-95"
                  )}
                >
                  Check availability
                </button>

                <div className="text-xs text-white/55">
                  Next, we’ll show if your zone has space or if you should join
                  the waiting list.
                </div>
              </div>
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
