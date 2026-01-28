"use client";

import { useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

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
  return v.trim().includes("@") && v.trim().includes(".");
}

function isLikelyUKMobile(v: string) {
  const digits = v.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("07")) return true;
  if (digits.length === 12 && digits.startsWith("447")) return true;
  return digits.length >= 10;
}

function isLikelyPostcode(v: string) {
  const s = v.trim().replace(/\s+/g, "");
  return s.length >= 5 && s.length <= 8;
}

export default function SignupClient() {
  const sp = useSearchParams();
  const router = useRouter();

  const qpPostcode = useMemo(
    () => (sp.get("postcode") || "").toUpperCase().trim(),
    [sp]
  );
  const zoneId = useMemo(() => (sp.get("zoneId") || "").trim(), [sp]);

  const [plan, setPlan] = useState<Plan>("BIN");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
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
          full_name: fullName,
          email,
          mobile,
          postcode,
          address_line_1: address1,
          address_line_2: address2,
          town,
          plan,
          zone_id: zoneId,
        }),
      });

      const createJson = await createRes.json().catch(() => ({}));
      if (!createRes.ok) {
        throw new Error(createJson?.error || "Customer create failed");
      }

      const customerId = createJson.customer_id;

      const gcRes = await fetch("/api/gocardless/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_id: customerId }),
      });

      const gcJson = await gcRes.json().catch(() => ({}));
      if (!gcRes.ok || !gcJson.authorisation_url) {
        throw new Error("Failed to start Direct Debit");
      }

      window.location.href = gcJson.authorisation_url;
    } catch (e: any) {
      setError(e?.message || "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#070A0F] text-white">
      <div className="relative mx-auto max-w-xl px-6 py-12">
        <header className="flex items-center justify-between">
          <div>
            <div className="text-sm text-white/70">KAB Group</div>
            <div className="text-xl font-semibold">Set up your subscription</div>
          </div>
          <Link
            href={`/availability?postcode=${encodeURIComponent(postcode || qpPostcode)}`}
            className="text-xs text-white/60 hover:text-white/80"
          >
            Back
          </Link>
        </header>

        <h1 className="mt-8 text-3xl font-semibold">Choose a plan</h1>

        <div className="mt-6 space-y-3">
          {(Object.keys(PLAN_META) as Plan[]).map((p) => {
            const meta = PLAN_META[p];
            const active = p === plan;

            return (
              <button
                key={p}
                type="button"
                onClick={() => setPlan(p)}
                className={cx(
                  "w-full rounded-xl border p-4 text-left",
                  active ? "border-cyan-400" : "border-white/10"
                )}
              >
                <div className="flex justify-between">
                  <div>
                    <div className="font-semibold">{meta.title}</div>
                    <div className="text-xs text-white/60">{meta.subtitle}</div>
                  </div>
                  <div className="font-semibold">{meta.priceLabel}</div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-8 space-y-3">
          <input className="input" placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <input className="input" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="input" placeholder="Mobile" value={mobile} onChange={(e) => setMobile(e.target.value)} />
          <input className="input" placeholder="Postcode" value={postcode} disabled={!!qpPostcode} />
          <input className="input" placeholder="Address line 1" value={address1} onChange={(e) => setAddress1(e.target.value)} />
          <input className="input" placeholder="Address line 2 (optional)" value={address2} onChange={(e) => setAddress2(e.target.value)} />
          <input className="input" placeholder="Town / City" value={town} onChange={(e) => setTown(e.target.value)} />
        </div>

        {error && <div className="mt-4 text-sm text-red-400">{error}</div>}

        <button
          onClick={startSignup}
          disabled={loading}
          className="mt-6 w-full rounded-xl bg-cyan-400 py-3 font-semibold text-black"
        >
          {loading ? "Starting Direct Debit…" : "Continue to Direct Debit"}
        </button>
      </div>
    </main>
  );
}
