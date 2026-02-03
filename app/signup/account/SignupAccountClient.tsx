"use client";

import { useMemo, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/client";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function isValidEmail(v: string) {
  const s = v.trim();
  return s.includes("@") && s.includes(".");
}

export default function SignupAccountClient({
  token,
  initialEmail,
  initialName,
}: {
  token: string;
  initialEmail: string;
  initialName: string;
}) {
  const [email, setEmail] = useState(initialEmail || "");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const hint = useMemo(() => {
    if (initialName && initialEmail) return `We found your details for ${initialName}.`;
    if (initialEmail) return "We found your email from your signup details.";
    return "Enter your email and we will send you a sign in link.";
  }, [initialName, initialEmail]);

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !isValidEmail(cleanEmail)) {
      setError("Enter a valid email address.");
      return;
    }
    if (!token) {
      setError("Missing signup token. Please restart signup.");
      return;
    }

    setStatus("sending");

    const supabase = createSupabaseBrowser();

    const baseUrl =
      (process.env.NEXT_PUBLIC_SITE_URL || "").trim().replace(/\/+$/, "") ||
      window.location.origin;

    const redirectTo = `${baseUrl}/auth/callback?next=${encodeURIComponent(
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
    <main className="min-h-[calc(100vh-72px)] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-48 left-1/2 h-[520px] w-[780px] -translate-x-1/2 rounded-full bg-gradient-to-r from-sky-500/20 via-cyan-400/10 to-blue-600/20 blur-3xl" />
        <div className="absolute -bottom-40 right-[-120px] h-[420px] w-[520px] rounded-full bg-gradient-to-tr from-blue-600/20 via-cyan-400/10 to-sky-400/10 blur-3xl" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.06] via-transparent to-transparent" />
      </div>

      <div className="relative mx-auto w-full max-w-xl px-6 py-12">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
          <div className="border-b border-white/10 p-6">
            <div className="text-sm text-white/70">Account setup</div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">Create your account</h1>
            <p className="mt-2 text-sm text-white/70">{hint}</p>
          </div>

          <div className="p-6">
            <form onSubmit={sendMagicLink} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs text-white/70">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={cx(
                    "w-full rounded-xl border bg-black/20 px-3 py-2.5 text-sm outline-none",
                    "border-white/10 focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/25"
                  )}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>

              {error && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-100">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={status === "sending"}
                className={cx(
                  "inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold transition",
                  "bg-gradient-to-r from-cyan-400 to-sky-500 text-black",
                  "hover:brightness-110 active:brightness-95",
                  "disabled:cursor-not-allowed disabled:opacity-60"
                )}
              >
                {status === "sending" ? "Sending link..." : "Send sign in link"}
              </button>

              {status === "sent" && (
                <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-white/80">
                  Link sent. Check your email, then click the sign in link to continue.
                </div>
              )}

              <div className="text-xs text-white/55">
                This link signs you in securely. No password needed.
              </div>
            </form>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-white/40">
          KAB Group. Reliable service, minimal hassle.
        </div>
      </div>
    </main>
  );
}
