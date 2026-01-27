// app/signup/completion/CompletionClient.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

type Status = "idle" | "pending" | "success" | "error";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export default function CompletionClient() {
  const sp = useSearchParams();

  const customerId = useMemo(() => (sp.get("customer_id") || "").trim(), [sp]);
  const returned = useMemo(() => (sp.get("returned") || "").trim(), [sp]);

  const hasRun = useRef(false);

  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState<number>(0);
  const [debugJson, setDebugJson] = useState<any>(null);

  const SHOW_DEBUG = process.env.NEXT_PUBLIC_SHOW_CHECKOUT_DEBUG === "true";

  useEffect(() => {
    if (!customerId) {
      setStatus("error");
      setError("Missing customer reference.");
      return;
    }

    if (returned !== "1") {
      setStatus("idle");
      return;
    }

    if (hasRun.current) return;
    hasRun.current = true;

    setStatus("pending");

    const run = async () => {
      const maxAttempts = 8;
      const delayMs = 1500;

      for (let i = 1; i <= maxAttempts; i++) {
        setAttempt(i);

        try {
          const res = await fetch("/api/gocardless/complete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ customer_id: customerId }),
          });

          const json = await res.json().catch(() => ({}));
          setDebugJson(json);

          if (res.ok) {
            setStatus("success");
            return;
          }

          if (res.status === 409) {
            await sleep(delayMs);
            continue;
          }

          throw new Error(json?.error || "Activation failed");
        } catch (e: any) {
          setStatus("error");
          setError(e?.message || "Something went wrong");
          return;
        }
      }

      setStatus("error");
      setError("Still waiting for Direct Debit confirmation. Please try again in a minute.");
    };

    run();
  }, [customerId, returned]);

  const view = useMemo(() => {
    if (status === "idle") {
      return {
        title: "Almost done",
        body: "Please return to GoCardless and complete the Direct Debit setup.",
        tone: "neutral" as const,
        primary: { label: "Back to sign up", href: "/signup" },
        secondary: { label: "Home", href: "/" },
      };
    }

    if (status === "pending") {
      return {
        title: "Finalising your signup",
        body: "Waiting for Direct Debit confirmation. This can take a moment.",
        tone: "pending" as const,
        primary: null,
        secondary: { label: "Home", href: "/" },
      };
    }

    if (status === "success") {
      return {
        title: "All set",
        body: "Your Direct Debit is active and your subscription has been set up.",
        tone: "success" as const,
        primary: { label: "Back to home", href: "/" },
        secondary: { label: "Check another postcode", href: "/address" },
      };
    }

    return {
      title: "We need to take a look",
      body: error || "Something went wrong.",
      tone: "error" as const,
      primary: { label: "Try again", href: "/address" },
      secondary: { label: "Home", href: "/" },
    };
  }, [status, error]);

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
                <div className="text-xl font-semibold tracking-tight">Direct Debit setup</div>
              </div>
            </div>

            <Link href="/" className="text-xs text-white/60 hover:text-white/80">
              Home
            </Link>
          </header>

          {/* Card */}
          <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.04] shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
            <div className="p-6">
              <div
                className={cx(
                  "rounded-xl border p-4",
                  view.tone === "success"
                    ? "border-cyan-400/30 bg-cyan-400/10"
                    : view.tone === "error"
                    ? "border-red-500/30 bg-red-500/10"
                    : "border-white/10 bg-black/20"
                )}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={cx(
                      "mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl border bg-black/20",
                      view.tone === "success"
                        ? "border-cyan-400/30 text-cyan-200"
                        : view.tone === "error"
                        ? "border-red-500/30 text-red-200"
                        : "border-white/10 text-white/70"
                    )}
                  >
                    {view.tone === "pending" ? (
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-cyan-300" />
                    ) : view.tone === "success" ? (
                      <span className="text-lg font-semibold">✓</span>
                    ) : view.tone === "error" ? (
                      <span className="text-lg font-semibold">!</span>
                    ) : (
                      <span className="text-lg font-semibold">…</span>
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="text-sm font-semibold">{view.title}</div>
                    <div
                      className={cx(
                        "mt-1 text-xs",
                        view.tone === "error" ? "text-red-100/80" : "text-white/70"
                      )}
                    >
                      {view.body}
                    </div>

                    {status === "pending" && (
                      <div className="mt-3 text-[11px] text-white/60">
                        Attempt {attempt} of 8
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                {view.primary && (
                  <Link
                    href={view.primary.href}
                    className={cx(
                      "inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold transition sm:w-auto",
                      "bg-gradient-to-r from-cyan-400 to-sky-500 text-black",
                      "hover:brightness-110 active:brightness-95"
                    )}
                  >
                    {view.primary.label}
                  </Link>
                )}

                <Link
                  href={view.secondary.href}
                  className="inline-flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white/85 hover:bg-white/[0.07] sm:w-auto"
                >
                  {view.secondary.label}
                </Link>
              </div>

              {/* Reference only when useful */}
              {customerId && status !== "idle" && (
                <div className="mt-5 rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="text-xs text-white/60">Reference</div>
                  <div className="mt-1 font-mono text-xs text-white/85 break-all">{customerId}</div>
                </div>
              )}

              {/* Debug hidden */}
              {SHOW_DEBUG && debugJson && (
                <details className="mt-5 rounded-xl border border-white/10 bg-black/20 p-4">
                  <summary className="cursor-pointer text-xs font-semibold text-white/75">
                    Debug details
                  </summary>
                  <pre className="mt-3 overflow-auto whitespace-pre-wrap break-words text-xs text-white/80">
                    {JSON.stringify(debugJson, null, 2)}
                  </pre>
                </details>
              )}
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
