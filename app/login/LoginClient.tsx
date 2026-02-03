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

export default function LoginClient() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const baseUrl = useMemo(() => {
    const env = (process.env.NEXT_PUBLIC_SITE_URL || "").trim().replace(/\/+$/, "");
    return env || window.location.origin;
  }, []);

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !isValidEmail(cleanEmail)) {
      setError("Enter a valid email address.");
      return;
    }

    setStatus("sending");

    const supabase = createSupabaseBrowser();
    const redirectTo = `${baseUrl}/auth/callback?next=${encodeURIComponent("/dashboard")}`;

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
    <main className="min-h-[calc(100vh-72px)] bg-[#070A0F] text-white">
      {/* Background accents */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-48 left-1/2 h-[520px] w-[780px] -translate-x-1/2 rounded-full bg-gradient-to-r from-sky-500/20 via-cyan-400/10 to-blue-600/20 blur-3xl" />
        <div className="absolute -bottom-40 right-[-120px] h-[420px] w-[520px] rounded-full bg-gradient-to-tr from-blue-600/20 via-cyan-400/10 to-sky-400/10 blur-3xl" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.06] via-transparent to-transparent" />
      </div>

      <div className="relative mx-auto flex w-full max-w-xl items-center px-6 py-12">
        <div className="w-full">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
            <div className="border-b border-white/10 p-6">
              <div className="text-sm text-white/70">Account</div>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">Sign in</h1>
              <p className="mt-2 text-sm text-white/70">
                We will email you a secure sign in link. No password needed.
              </p>
            </div>

            <div className="p-6">
              <form onSubmit={sendLink} className="space-y-4">
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
                    "relative inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold transition",
                    "bg-gradient-to-r from-cyan-400 to-sky-500 text-black",
                    "hover:brightness-110 active:brightness-95",
                    "disabled:cursor-not-allowed disabled:opacity-60"
                  )}
                >
                  {status === "sending" && (
                    <span className="absolute left-3 inline-flex h-4 w-4 animate-spin rounded-full border-2 border-black/40 border-t-black" />
                  )}
                  {status === "sending" ? "Sending link..." : "Send sign in link"}
                </button>

                {status === "sent" && (
                  <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-white/80">
                    Link sent. Check your inbox (and junk), then click the sign in link.
                  </div>
                )}

                <div className="text-xs text-white/55">
                  If you are signing in on a different device, use the same email you used for signup.
                </div>
              </form>
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
