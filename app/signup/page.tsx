// app/signup/page.tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Plan = "BIN" | "BIN_PLUS_GREEN";

const PLAN_META: Record<
  Plan,
  { title: string; subtitle: string; pricePence: number; priceLabel: string }
> = {
  BIN: {
    title: "Wheelie Bin Cleaning",
    subtitle: "Regular external clean and tidy finish",
    pricePence: 1000,
    priceLabel: "£10 / month",
  },
  BIN_PLUS_GREEN: {
    title: "Bin + Green Bin Cleaning",
    subtitle: "Wheelie bin plus green bin included",
    pricePence: 1500,
    priceLabel: "£15 / month",
  },
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function isValidEmail(v: string) {
  const s = v.trim();
  return s.includes("@") && s.includes(".");
}

function isLikelyUKMobile(v: string) {
  const digits = v.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("07")) return true;
  if (digits.length === 12 && digits.startsWith("447")) return true;
  if (digits.length === 13 && digits.startsWith("0447")) return true;
  return digits.length >= 10;
}

function isLikelyPostcode(v: string) {
  const s = v.trim().replace(/\s+/g, "");
  return s.length >= 5 && s.length <= 8;
}

function normalisePostcode(v: string) {
  return v.toUpperCase().trim().replace(/\s+/g, " ");
}

export default function SignupPage() {
  const sp = useSearchParams();
  const router = useRouter();

  const qpPostcode = useMemo(() => normalisePostcode(sp.get("postcode") || ""), [sp]);
  const zoneId = useMemo(() => (sp.get("zoneId") || "").trim(), [sp]);

  const [plan, setPlan] = useState<Plan>("BIN");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");

  // Prefill from query, but keep editable if user arrived directly.
  const [postcode, setPostcode] = useState(qpPostcode);

  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [town, setTown] = useState("");

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = PLAN_META[plan];

  const validation = useMemo(() => {
    const missing: string[] = [];

    const nameOk = fullName.trim().length >= 2;
    const emailOk = isValidEmail(email);
    const mobileOk = mobile.trim().length >= 8 && isLikelyUKMobile(mobile);
    const postcodeOk = isLikelyPostcode(postcode);
    const addressOk = address1.trim().length >= 4;
    const townOk = town.trim().length >= 2;

    if (!nameOk) missing.push("Full name");
    if (!emailOk) missing.push("Email");
    if (!mobileOk) missing.push("Mobile");
    if (!postcodeOk) missing.push("Postcode");
    if (!addressOk) missing.push("Address line 1");
    if (!townOk) missing.push("Town / City");

    return { ok: missing.length === 0, missing, nameOk, emailOk, mobileOk, postcodeOk, addressOk, townOk };
  }, [fullName, email, mobile, postcode, address1, town]);

  async function startSignup() {
    setSubmitted(true);
    setError(null);

    if (!zoneId) {
      setError("Missing zone reference. Please go back and check availability again.");
      return;
    }

    if (!validation.ok) {
      setError(`Please complete: ${validation.missing.join(", ")}.`);
      return;
    }

    setLoading(true);

    try {
      const createRes = await fetch("/api/customers/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName.trim(),
          email: email.trim(),
          mobile: mobile.trim(),
          postcode: normalisePostcode(postcode),
          address_line_1: address1.trim(),
          address_line_2: address2.trim() || null,
          town: town.trim(),
          plan,
          zone_id: zoneId,
        }),
      });

      const createJson = await createRes.json().catch(() => ({}));
      if (!createRes.ok) {
        throw new Error(createJson?.details || createJson?.error || "Customer create failed");
      }

      const customerId: string = createJson.customer_id;
      if (!customerId) throw new Error("Missing customer_id");

      const gcRes = await fetch("/api/gocardless/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_id: customerId }),
      });

      const gcJson = await gcRes.json().catch(() => ({}));
      if (!gcRes.ok) throw new Error(gcJson?.error || "GoCardless start failed");
      if (!gcJson.authorisation_url) throw new Error("Missing authorisation_url");

      window.location.href = gcJson.authorisation_url;
    } catch (e: any) {
      setError(e?.message || "Something went wrong");
      setLoading(false);
    }
  }

  const nameInvalid = submitted && !validation.nameOk;
  const emailInvalid = submitted && !validation.emailOk;
  const mobileInvalid = submitted && !validation.mobileOk;
  const postcodeInvalid = submitted && !validation.postcodeOk;
  const addressInvalid = submitted && !validation.addressOk;
  const townInvalid = submitted && !validation.townOk;

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
                <img src="/kab-logo.png" alt="KAB Group" className="hidden h-full w-full object-cover" />
                <span className="text-xs font-semibold text-white/70">KAB</span>
              </div>

              <div className="leading-tight">
                <div className="text-sm text-white/70">KAB Group</div>
                <div className="text-xl font-semibold tracking-tight">Set up your subscription</div>
              </div>
            </div>

            <button
              type="button"
              className="text-xs text-white/60 hover:text-white/80"
              onClick={() => router.push(`/availability?postcode=${encodeURIComponent(postcode || qpPostcode)}`)}
            >
              Back
            </button>
          </header>

          <h1 className="mt-10 text-3xl font-semibold tracking-tight sm:text-4xl">
            Choose a plan and continue
          </h1>

          <p className="mt-3 text-sm text-white/70">
            You’ll complete Direct Debit securely on GoCardless.
          </p>

          {/* Plan */}
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.04] shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
            <div className="p-6">
              <div className="text-sm font-semibold">Plan</div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {(["BIN", "BIN_PLUS_GREEN"] as Plan[]).map((p) => {
                  const meta = PLAN_META[p];
                  const active = p === plan;

                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPlan(p)}
                      className={cx(
                        "rounded-xl border p-4 text-left transition",
                        "bg-black/20 hover:bg-white/[0.06]",
                        active ? "border-cyan-400/60 ring-1 ring-cyan-400/30" : "border-white/10"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold">{meta.title}</div>
                          <div className="mt-0.5 text-xs text-white/70">{meta.subtitle}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold">{meta.priceLabel}</div>
                          <div className="mt-1 text-[11px] text-white/60">{active ? "Selected" : "Select"}</div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 text-xs text-white/60">
                Selected: <span className="font-semibold text-white/80">{selected.title}</span>
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
            <div className="p-6">
              <div className="text-sm font-semibold">Your details</div>
              <div className="mt-1 text-xs text-white/60">
                We use these to set up your Direct Debit and confirm your subscription.
              </div>

              <div className="mt-4 grid gap-3">
                <div>
                  <label className="mb-1 block text-xs text-white/70">Full name</label>
                  <input
                    className={cx(
                      "w-full rounded-xl border bg-black/20 px-3 py-2.5 text-sm outline-none",
                      "placeholder:text-white/35 focus:ring-2 focus:ring-cyan-400/25",
                      nameInvalid ? "border-red-500/40 focus:border-red-500/60" : "border-white/10 focus:border-cyan-400/50"
                    )}
                    placeholder="Barry Fairgrieve"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    autoComplete="name"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs text-white/70">Email</label>
                  <input
                    className={cx(
                      "w-full rounded-xl border bg-black/20 px-3 py-2.5 text-sm outline-none",
                      "placeholder:text-white/35 focus:ring-2 focus:ring-cyan-400/25",
                      emailInvalid ? "border-red-500/40 focus:border-red-500/60" : "border-white/10 focus:border-cyan-400/50"
                    )}
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    inputMode="email"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs text-white/70">Mobile</label>
                  <input
                    className={cx(
                      "w-full rounded-xl border bg-black/20 px-3 py-2.5 text-sm outline-none",
                      "placeholder:text-white/35 focus:ring-2 focus:ring-cyan-400/25",
                      mobileInvalid ? "border-red-500/40 focus:border-red-500/60" : "border-white/10 focus:border-cyan-400/50"
                    )}
                    placeholder="07123 456789"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    autoComplete="tel"
                    inputMode="tel"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs text-white/70">Postcode</label>
                  <input
                    className={cx(
                      "w-full rounded-xl border bg-black/20 px-3 py-2.5 text-sm uppercase outline-none",
                      "placeholder:text-white/35 focus:ring-2 focus:ring-cyan-400/25",
                      postcodeInvalid ? "border-red-500/40 focus:border-red-500/60" : "border-white/10 focus:border-cyan-400/50"
                    )}
                    placeholder="LA3 2FW"
                    value={postcode}
                    onChange={(e) => setPostcode(normalisePostcode(e.target.value))}
                    autoComplete="postal-code"
                    disabled={!!qpPostcode}
                  />
                  {qpPostcode && (
                    <p className="mt-2 text-[11px] text-white/50">
                      We’ve used the postcode from your availability check.
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-xs text-white/70">Address line 1</label>
                  <input
                    className={cx(
                      "w-full rounded-xl border bg-black/20 px-3 py-2.5 text-sm outline-none",
                      "placeholder:text-white/35 focus:ring-2 focus:ring-cyan-400/25",
                      addressInvalid ? "border-red-500/40 focus:border-red-500/60" : "border-white/10 focus:border-cyan-400/50"
                    )}
                    placeholder="8 Nightingale Close"
                    value={address1}
                    onChange={(e) => setAddress1(e.target.value)}
                    autoComplete="address-line1"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs text-white/70">Address line 2 (optional)</label>
                  <input
                    className={cx(
                      "w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm outline-none",
                      "placeholder:text-white/35 focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/25"
                    )}
                    placeholder="Flat, building, etc."
                    value={address2}
                    onChange={(e) => setAddress2(e.target.value)}
                    autoComplete="address-line2"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs text-white/70">Town / City</label>
                  <input
                    className={cx(
                      "w-full rounded-xl border bg-black/20 px-3 py-2.5 text-sm outline-none",
                      "placeholder:text-white/35 focus:ring-2 focus:ring-cyan-400/25",
                      townInvalid ? "border-red-500/40 focus:border-red-500/60" : "border-white/10 focus:border-cyan-400/50"
                    )}
                    placeholder="Morecambe"
                    value={town}
                    onChange={(e) => setTown(e.target.value)}
                    autoComplete="address-level2"
                  />
                </div>

                {error && (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-100">
                    {error}
                  </div>
                )}

                <button
                  type="button"
                  onClick={startSignup}
                  disabled={loading}
                  className={cx(
                    "relative inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold transition",
                    "bg-gradient-to-r from-cyan-400 to-sky-500 text-black",
                    "hover:brightness-110 active:brightness-95",
                    "disabled:cursor-not-allowed disabled:opacity-60"
                  )}
                >
                  {loading && (
                    <span className="absolute left-3 inline-flex h-4 w-4 animate-spin rounded-full border-2 border-black/40 border-t-black" />
                  )}
                  {loading ? "Starting Direct Debit..." : "Continue to Direct Debit"}
                </button>

                <div className="text-xs text-white/55">
                  Secure Direct Debit via GoCardless. Cancel anytime.
                </div>
              </div>
            </div>
          </div>

          {/* Loading overlay */}
          {loading && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0B1020]/90 p-6 text-center">
                <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-cyan-300" />
                <div className="text-sm font-semibold">Starting Direct Debit</div>
                <div className="mt-1 text-xs text-white/60">Sending you to GoCardless to complete setup</div>
              </div>
            </div>
          )}

          <div className="mt-6 text-center text-xs text-white/40">
            KAB Group. Reliable service, minimal hassle.
          </div>
        </div>
      </div>
    </main>
  );
}
