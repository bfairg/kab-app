"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase/client";

type Status = "checking" | "claiming" | "success" | "error";

export default function SignupAccountCompleteClient() {
  const sp = useSearchParams();
  const router = useRouter();

  const token = useMemo(() => (sp.get("token") || "").trim(), [sp]);

  const [status, setStatus] = useState<Status>("checking");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function run() {
      setError(null);

      if (!token) {
        setStatus("error");
        setError("Missing token. Please restart signup.");
        return;
      }

      const supabase = createSupabaseBrowser();
      const { data } = await supabase.auth.getUser();

      if (!data.user) {
        setStatus("error");
        setError("You are not signed in. Please use the email link again.");
        return;
      }

      setStatus("claiming");

      const res = await fetch("/api/customers/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        setStatus("error");
        setError(json?.error || "Could not link your account.");
        return;
      }

      setStatus("success");
      router.replace("/dashboard");
    }

    run();
  }, [token, router]);

  return (
    <main className="mx-auto max-w-lg p-6">
      <h1 className="text-2xl font-semibold">Finishing setup</h1>

      {status === "checking" && <p className="mt-3 text-sm text-black/70">Checking sign in...</p>}
      {status === "claiming" && <p className="mt-3 text-sm text-black/70">Linking your account...</p>}
      {status === "success" && <p className="mt-3 text-sm text-black/70">Done. Redirecting...</p>}

      {status === "error" && (
        <div className="mt-4 rounded-xl border p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </main>
  );
}
