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

  const validation = useMemo(() => {
    const aOk = address1.trim().length >= 4;
    const pOk = isLikelyPostcode(postcode);
    const missing: string[] = [];
    if (!aOk) missing.push("Address");
    if (!pOk) missing.push("Postcode");
    return { ok: aOk && pOk, missing, aOk, pOk };
  }, [address1, postcode]);

  function next() {
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

  return (
    <main className="min-h-screen bg-[#070A0F] text-white">
      {/* Background accents */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-48 left-1/2 h-[520px] w-[780px] -translate-x-1/2 rounded-full bg-gradient-to-r from-sky-500/20 via-cyan-400/10 to-blue-600/20 blur-3xl" />
        <div className="absolute -bottom-40 right-[-120px] h-[420px] w-[520px] rounded-full bg-gradient-to-tr from-blue-600/20 via-cyan-400/10 to-sky-400/10 blur-3xl" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.06] via-transparent to-transparent" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center px-6 py-10">
        <div className="grid w-full grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Left copy */}
          <section className="lg:col-span-6">
            <header className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                {/* Optional logo: add file to /public/kab-logo.png */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/kab-logo.png" alt="KAB Group" className="hidden h-full w-full object-cover" />
                <span className="text-xs font-semibold text-white/70">KAB</span>
              </div>
              <div className="leading-tight">
                <div className="text-sm text-white/70">KAB Group</div>
                <div className="text-xl font-semibold tracking-tight">Check availability</div>
              </div>
            </header>

            <h1 className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">
              Tell us where you are
            </h1>
            <p className="mt-3 max-w-xl text-sm text-white/70">
              We use your address to identify your zone and check current capacity. This takes a few seconds.
            </p>

            <div className="mt-6 flex flex-wrap gap-2 text-xs text-white/70">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Fast zone lookup</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">No spam</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Local service</span>
            </div>

            <div className="mt-8">
              <Link href="/" className="text-xs text-white/60 hover:text-white/80">
                ← Back to home
              </Link>
            </div>
          </section>

          {/* Right form card */}
          <section className="lg:col-span-6">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
              <div className="border-b border-white/10 p-6">
                <div className="text-sm font-semibold">Your address</div>
                <div className="mt-1 text-xs text-white/60">
                  Enter your address line 1 and postcode to find your zone.
                </div>
              </div>

              <div className="p-6">
                <div className="grid gap-4">
                  <div>
                    <label className="mb-1 block text-xs text-white/70">Address line 1</label>
                    <input
                      className={cx(
                        "w-full rounded-xl border bg-black/20 px-3 py-2.5 text-sm outline-none",
                        "placeholder:text-white/35 focus:ring-2 focus:ring-cyan-400/25",
                        validation.aOk ? "border-white/10 focus:border-cyan-400/50" : "border-red-500/40"
                      )}
                      placeholder="8 Nightingale Close"
                      value={address1}
                      onChange={(e) => setAddress1(e.target.value)}
                      autoComplete="address-line1"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") next();
                      }}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs text-white/70">Postcode</label>
                    <input
                      className={cx(
                        "w-full rounded-xl border bg-black/20 px-3 py-2.5 text-sm uppercase outline-none",
                        "placeholder:text-white/35 focus:ring-2 focus:ring-cyan-400/25",
                        validation.pOk ? "border-white/10 focus:border-cyan-400/50" : "border-red-500/40"
                      )}
                      placeholder="LA3 2FW"
                      value={postcode}
                      onChange={(e) => setPostcode(e.target.value.toUpperCase())}
                      autoComplete="postal-code"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") next();
                      }}
                    />
                    <p className="mt-2 text-[11px] text-white/50">
                      Tip: we only need the first line and postcode to match your zone.
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

                  <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-white/60">
                    Next, we’ll show whether your zone has space right now or if you should join the waiting list.
                  </div>
                </div>
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
