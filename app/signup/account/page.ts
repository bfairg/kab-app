"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase/client";

export default function SignupAccountPage() {
  const sp = useSearchParams();
  const token = useMemo(() => (sp.get("token") || "").trim(), [sp]);

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError("Enter your email address.");
      return;
    }
    if (!token) {
      setError("Missing signup token. Please restart signup.");
      return;
    }

    setStatus("sending");

    const supabase = createSupabaseBrowser();

    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(
      "/signup/account/complete"
    )}&token=${encodeURIComponent(token)}`;

    const { error: authError } = await supabase.auth.signInWithOtp({
      email: cleanEmail,
      options: { emailRedirectTo: redirectTo },
    });

    if (authError) {
      setStatus("error");
      setError(authError.message);
      return;
    }

    setStatus("sent");
  }

  return (
    <main className="mx-auto max-w-lg p-6">
      <h1 className="text-2xl font-semibold">Create your account</h1>
      <p className="mt-2 text-sm text-black/70">
        Enter your email and we will send you a sign in link.
      </p>

      <form onSubmit={sendMagicLink} className="mt-6 space-y-3">
        <label className="block text-sm font-medium">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border px-4 py-3"
          placeholder="you@example.com"
          autoComplete="email"
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={status === "sending"}
          className="w-full rounded-xl bg-black px-4 py-3 text-white disabled:opacity-60"
        >
          {status === "sending" ? "Sending link..." : "Send sign in link"}
        </button>

        {status === "sent" && (
          <div className="rounded-xl border p-4 text-sm">
            Link sent. Check your email, then click the sign in link to continue.
          </div>
        )}
      </form>
    </main>
  );
}
