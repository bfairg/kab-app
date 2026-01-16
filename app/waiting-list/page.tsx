"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

function normalisePostcode(input: string) {
  return input
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");
}

export default function WaitingListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const postcode = useMemo(() => {
    const raw = searchParams.get("postcode") || "";
    return normalisePostcode(raw);
  }, [searchParams]);

  const zoneId = useMemo(() => {
    return (searchParams.get("zoneId") || "").trim();
  }, [searchParams]);

  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!postcode) {
      setError("Missing postcode. Please go back and try again.");
      return;
    }
    if (!cleanEmail) {
      setError("Please enter your email.");
      return;
    }

    setSubmitting(true);

    const { error } = await supabase.from("waiting_list").insert({
      postcode,
      zone_id: zoneId || null,
      email: cleanEmail,
    });

    setSubmitting(false);

    if (error) {
      setError(error.message);
      return;
    }

    setMessage("You’re on the waiting list. We’ll be in touch when space opens.");
    setEmail("");
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-2xl space-y-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-semibold">Join the waiting list</h1>
          <p className="text-sm text-neutral-500">
            Postcode: <span className="font-medium text-neutral-200">{postcode || "Unknown"}</span>
          </p>
        </div>

        <div className="rounded-xl border p-5 space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-neutral-300">Email</label>
            <input
              className="w-full rounded-lg border bg-transparent px-3 py-3 outline-none"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              inputMode="email"
              autoComplete="email"
            />
          </div>

          <button
            onClick={submit}
            disabled={submitting}
            className="w-full rounded-lg bg-white text-black py-3 font-medium disabled:opacity-60"
          >
            {submitting ? "Saving..." : "Join waiting list"}
          </button>

          {error && <p className="text-sm text-red-400">{error}</p>}
          {message && <p className="text-sm text-green-300">{message}</p>}

          <button
            onClick={() => router.push("/address")}
            className="text-sm underline"
          >
            Back
          </button>
        </div>
      </div>
    </main>
  );
}
