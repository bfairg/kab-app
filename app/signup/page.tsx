// app/signup/page.tsx

"use client";

import { useMemo, useState } from "react";

type Plan = "BIN" | "BIN_PLUS_GREEN";

const PLAN_META: Record<
  Plan,
  {
    title: string;
    subtitle: string;
    pricePence: number;
    priceLabel: string;
    bullets: string[];
  }
> = {
  BIN: {
    title: "Wheelie Bin Cleaning",
    subtitle: "Regular external clean and tidy finish",
    pricePence: 1000,
    priceLabel: "£10 / month",
    bullets: ["Reliable monthly cycle", "Quick, professional clean", "Local service"],
  },
  BIN_PLUS_GREEN: {
    title: "Bin + Green Bin Cleaning",
    subtitle: "Wheelie bin plus green bin included",
    pricePence: 1500,
    priceLabel: "£15 / month",
    bullets: ["Includes green bin", "Reliable monthly cycle", "Best value bundle"],
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
  // Accept 07xxxxxxxxx (11 digits) or +44 variant
  if (digits.length === 11 && digits.startsWith("07")) return true;
  if (digits.length === 12 && digits.startsWith("447")) return true;
  if (digits.length === 13 && digits.startsWith("0447")) return true;
  return digits.length >= 10; // allow while typing
}

function isLikelyPostcode(v: string) {
  const s = v.trim().replace(/\s+/g, "");
  return s.length >= 5 && s.length <= 8;
}

export default function SignupPage() {
  const [plan, setPlan] = useState<Plan>("BIN");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [postcode, setPostcode] = useState("");
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [town, setTown] = useState("");
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

    return {
      ok: missing.length === 0,
      missing,
      nameOk,
      emailOk,
      mobileOk,
      postcodeOk,
      addressOk,
      townOk,
    };
  }, [fullName, email, mobile, postcode, address1, town]);

  const startSignup = async () => {
    setError(null);

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
          full_name: fullName,
          email,
          mobile,
          postcode,
          address_line_1: address1,
          address_line_2: address2,
          town,
          plan,
        }),
      });

      const createJson = await createRes.json();
      if (!createRes.ok) throw new Error(createJson?.details || createJson?.error || "Customer create failed");

      const customerId: string = createJson.customer_id;

      const gcRes = await fetch("/api/gocardless/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_id: customerId }),
      });

      const gcJson = await gcRes.json();
      if (!gcRes.ok) throw new Error(gcJson?.error || "GoCardless start failed");

      if (!gcJson.authorisation_url) throw new Error("Missing authorisation_url");

      window.location.href = gcJson.authorisation_url;
    } catch (e: any) {
      setError(e?.message || "Something went wrong");
      setLoading(false);
    }
  };

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
            {/* Put your logo in /public/logo.png OR update src below */}
            <div className="h-10 w-10 overflow-hidden rounded-xl border border-white/10 bg-white/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.png"
                alt="KAB Group"
                className="h-full w-full object-cover"
                onError={(e) => {
                  // If logo missing, hide the image and keep the container
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            </div>

            <div className="leading-tight">
              <div className="text-sm text-white/70">KAB Group</div>
              <div className="text-lg font-semibold tracking-tight">Set up your subscription</div>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-3 text-xs text-white/70">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
              Secure Direct Debit via GoCardless
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Cancel anytime</span>
          </div>
        </header>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left column */}
          <section className="lg:col-span-7">
            {/* Card */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
              <div className="border-b border-white/10 p-6">
                <h1 className="text-xl font-semibold tracking-tight">Choose your plan</h1>
                <p className="mt-1 text-sm text-white/70">
                  Pick the subscription that fits. You will set up Direct Debit on the next step.
                </p>
              </div>

              <div className="p-6">
                {/* Plan selector */}
                <div className="grid gap-3 sm:grid-cols-2">
                  {(["BIN", "BIN_PLUS_GREEN"] as Plan[]).map((p) => {
                    const meta = PLAN_META[p];
                    const active = p === plan;

                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPlan(p)}
                        className={cx(
                          "group relative rounded-xl border p-4 text-left transition",
                          "bg-black/20 hover:bg-white/[0.06]",
                          active ? "border-cyan-400/60 ring-1 ring-cyan-400/30" : "border-white/10"
                        )}
                      >
                        <div
                          className={cx(
                            "absolute inset-0 rounded-xl opacity-0 transition",
                            active && "opacity-100",
                            "bg-gradient-to-b from-cyan-400/10 via-transparent to-transparent"
                          )}
                        />

                        <div className="relative flex items-start justify-between gap-3">
                          <div>
                            <div className="font-semibold">{meta.title}</div>
                            <div className="mt-0.5 text-sm text-white/70">{meta.subtitle}</div>
                          </div>

                          <div className="text-right">
                            <div className="text-sm font-semibold">{meta.priceLabel}</div>
                            <div className={cx("mt-1 text-[11px]", active ? "text-cyan-200/80" : "text-white/50")}>
                              {active ? "Selected" : "Select"}
                            </div>
                          </div>
                        </div>

                        <ul className="relative mt-3 space-y-1 text-xs text-white/70">
                          {meta.bullets.map((b) => (
                            <li key={b} className="flex gap-2">
                              <span className="mt-[7px] h-1 w-1 rounded-full bg-white/50" />
                              <span>{b}</span>
                            </li>
                          ))}
                        </ul>
                      </button>
                    );
                  })}
                </div>

                {/* Details */}
                <div className="mt-6">
                  <h2 className="text-sm font-semibold text-white/90">Your details</h2>
                  <p className="mt-1 text-xs text-white/60">
                    We use these to set up your Direct Debit and confirm your subscription.
                  </p>

                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-xs text-white/70">Full name</label>
                      <input
                        className={cx(
                          "w-full rounded-xl border bg-black/20 px-3 py-2.5 text-sm outline-none",
                          "placeholder:text-white/35 focus:ring-2 focus:ring-cyan-400/25",
                          validation.nameOk ? "border-white/10 focus:border-cyan-400/50" : "border-red-500/40"
                        )}
                        placeholder="Barry Fairgrieve"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        autoComplete="name"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-xs text-white/70">Email</label>
                      <input
                        className={cx(
                          "w-full rounded-xl border bg-black/20 px-3 py-2.5 text-sm outline-none",
                          "placeholder:text-white/35 focus:ring-2 focus:ring-cyan-400/25",
                          validation.emailOk ? "border-white/10 focus:border-cyan-400/50" : "border-red-500/40"
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
                          validation.mobileOk ? "border-white/10 focus:border-cyan-400/50" : "border-red-500/40"
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
                          validation.postcodeOk ? "border-white/10 focus:border-cyan-400/50" : "border-red-500/40"
                        )}
                        placeholder="LA3 2FW"
                        value={postcode}
                        onChange={(e) => setPostcode(e.target.value.toUpperCase())}
                        autoComplete="postal-code"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-xs text-white/70">Address line 1</label>
                      <input
                        className={cx(
                          "w-full rounded-xl border bg-black/20 px-3 py-2.5 text-sm outline-none",
                          "placeholder:text-white/35 focus:ring-2 focus:ring-cyan-400/25",
                          validation.addressOk ? "border-white/10 focus:border-cyan-400/50" : "border-red-500/40"
                        )}
                        placeholder="8 Nightingale Close"
                        value={address1}
                        onChange={(e) => setAddress1(e.target.value)}
                        autoComplete="address-line1"
                      />
                    </div>

                    <div className="sm:col-span-2">
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

                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-xs text-white/70">Town / City</label>
                      <input
                        className={cx(
                          "w-full rounded-xl border bg-black/20 px-3 py-2.5 text-sm outline-none",
                          "placeholder:text-white/35 focus:ring-2 focus:ring-cyan-400/25",
                          validation.townOk ? "border-white/10 focus:border-cyan-400/50" : "border-red-500/40"
                        )}
                        placeholder="Morecambe"
                        value={town}
                        onChange={(e) => setTown(e.target.value)}
                        autoComplete="address-level2"
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-100">
                      {error}
                    </div>
                  )}

                  <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-xs text-white/60">
                      By continuing, you agree to set up a Direct Debit for your chosen plan.
                    </div>

                    <button
                      type="button"
                      onClick={startSignup}
                      disabled={loading}
                      className={cx(
                        "relative inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold transition sm:w-auto",
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
                  </div>
                </div>
              </div>
            </div>

            {/* Small trust strip for mobile */}
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/70 sm:hidden">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Secure Direct Debit via GoCardless</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Cancel anytime</span>
            </div>
          </section>

          {/* Right column: Summary */}
          <aside className="lg:col-span-5">
            <div className="lg:sticky lg:top-8">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">Summary</div>
                    <div className="mt-1 text-xs text-white/60">Review before you continue</div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-right">
                    <div className="text-xs text-white/60">Monthly</div>
                    <div className="text-sm font-semibold">{selected.priceLabel.replace(" / month", "")}</div>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="text-sm font-semibold">{selected.title}</div>
                  <div className="mt-1 text-xs text-white/60">{selected.subtitle}</div>

                  <div className="mt-3 grid gap-2 text-xs text-white/70">
                    <div className="flex items-center justify-between">
                      <span>Plan</span>
                      <span className="text-white/90">{plan === "BIN" ? "BIN" : "BIN + GREEN"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Price</span>
                      <span className="text-white/90">{selected.priceLabel}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Billing</span>
                      <span className="text-white/90">Monthly by Direct Debit</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-2 text-xs text-white/60">
                  <p>
                    After you continue, you will be taken to GoCardless to securely set up your Direct Debit.
                  </p>
                  <p>
                    Monthly payments are taken on the 1st where possible. If you sign up after the 25th, your subscription
                    starts on the 1st of the month after next.
                  </p>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 text-xs text-white/70">
                  <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <div className="text-white/90 font-semibold">Secure</div>
                    <div className="mt-1 text-white/60">GoCardless hosted checkout</div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <div className="text-white/90 font-semibold">Flexible</div>
                    <div className="mt-1 text-white/60">Cancel anytime</div>
                  </div>
                </div>

                {!validation.ok && (
                  <div className="mt-5 rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-white/70">
                    <div className="font-semibold text-white/85">To continue</div>
                    <div className="mt-1 text-white/60">
                      Complete: <span className="text-white/80">{validation.missing.join(", ")}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 text-center text-xs text-white/40">
                KAB Group. Local, reliable, eco minded service.
              </div>
            </div>
          </aside>
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
    </main>
  );
}
