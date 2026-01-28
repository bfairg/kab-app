"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

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

  const header = useMemo(() => {
    if (status === "idle") {
      return {
        title: "Almost done",
        subtitle: "Please return to the signup page and complete the Direct Debit setup.",
        tone: "neutral" as const,
      };
    }
    if (status === "pending") {
      return {
        title: "Finalising your signup",
        subtitle: "We’re waiting for Direct Debit confirmation from the bank. This can take a moment.",
        tone: "pending" as const,
      };
    }
    if (status === "success") {
      return {
        title: "All set",
        subtitle: "Your Direct Debit is active. Your subscription has been set up and a confirmation email has been sent.",
        tone: "success" as const,
      };
    }
    return {
      title: "We need to take a look",
      subtitle: error || "Something went wrong.",
      tone: "error" as const,
    };
  }, [status, error]);

  return (
    <main className="min-h-screen bg-[#070A0F] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-48 left-1/2 h-[520px] w-[780px] -translate-x-1/2 rounded-full bg-gradient-to-r from-sky-500/20 via-cyan-400/10 to-blue-600/20 blur-3xl" />
        <div className="absolute -bottom-40 right-[-120px] h-[420px] w-[520px] rounded-full bg-gradient-to-tr from-blue-600/20 via-cyan-400/10 to-sky-400/10 blur-3xl" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.06] via-transparent to-transparent" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center px-6 py-10">
        <div className="w-full">
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

            <a
              href="/"
              className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/[0.07]"
            >
              Home
            </a>
          </header>

          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
            <section className="lg:col-span-7">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
                <div className="border-b border-white/10 p-6">
                  <div className="text-sm font-semibold">{header.title}</div>
                  <div
                    className={cx(
                      "mt-1 text-sm",
                      header.tone === "error" ? "text-red-200/90" : "text-white/70"
                    )}
                  >
                    {header.subtitle}
                  </div>
                </div>

                <div className="p-6">
                  <div
                    className={cx(
                      "rounded-xl border p-4",
                      header.tone === "success"
                        ? "border-cyan-400/30 bg-cyan-400/10"
                        : header.tone === "error"
                        ? "border-red-500/30 bg-red-500/10"
                        : "border-white/10 bg-black/20"
                    )}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={cx(
                          "mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl border",
                          header.tone === "success"
                            ? "border-cyan-400/30 bg-black/20 text-cyan-200"
                            : header.tone === "error"
                            ? "border-red-500/30 bg-black/20 text-red-200"
                            : "border-white/10 bg-black/20 text-white/70"
                        )}
                      >
                        {header.tone === "pending" ? (
                          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-cyan-300" />
                        ) : header.tone === "success" ? (
                          <span className="text-lg font-semibold">✓</span>
                        ) : header.tone === "error" ? (
                          <span className="text-lg font-semibold">!</span>
                        ) : (
                          <span className="text-lg font-semibold">…</span>
                        )}
                      </div>

                      <div className="flex-1">
                        {status === "pending" && (
                          <>
                            <div className="text-sm font-semibold">Activating your subscription</div>
                            <div className="mt-1 text-xs text-white/60">
                              Attempt {attempt} of 8. We’ll auto-refresh while we wait for confirmation.
                            </div>

                            <div className="mt-3 h-2 w-full rounded-full bg-white/10">
                              <div
                                className="h-2 rounded-full bg-gradient-to-r from-cyan-400 to-sky-500 transition-all"
                                style={{ width: `${Math.min(100, Math.max(8, (attempt / 8) * 100))}%` }}
                              />
                            </div>
                          </>
                        )}

                        {status === "idle" && (
                          <>
                            <div className="text-sm font-semibold">Return to GoCardless</div>
                            <div className="mt-1 text-xs text-white/60">
                              If you closed the window early, please return and complete the Direct Debit setup.
                            </div>
                            <div className="mt-4">
                              <a
                                href="/signup"
                                className={cx(
                                  "inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold transition sm:w-auto",
                                  "bg-gradient-to-r from-cyan-400 to-sky-500 text-black",
                                  "hover:brightness-110 active:brightness-95"
                                )}
                              >
                                Back to sign up
                              </a>
                            </div>
                          </>
                        )}

                        {status === "success" && (
                          <>
                            <div className="text-sm font-semibold">Confirmation sent</div>
                            <div className="mt-1 text-xs text-white/60">
                              Check your inbox for the details. If you can’t see it, check junk.
                            </div>

                            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                              <a
                                href="/"
                                className={cx(
                                  "inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold transition sm:w-auto",
                                  "bg-gradient-to-r from-cyan-400 to-sky-500 text-black",
                                  "hover:brightness-110 active:brightness-95"
                                )}
                              >
                                Back to home
                              </a>
                              <a
                                href="/address"
                                className="inline-flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white/85 hover:bg-white/[0.07] sm:w-auto"
                              >
                                Check another postcode
                              </a>
                            </div>
                          </>
                        )}

                        {status === "error" && (
                          <>
                            <div className="text-sm font-semibold">Please contact support</div>
                            <div className="mt-1 text-xs text-white/60">
                              Quote the reference below so we can find your signup quickly.
                            </div>

                            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                              <a
                                href="/address"
                                className={cx(
                                  "inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold transition sm:w-auto",
                                  "bg-gradient-to-r from-cyan-400 to-sky-500 text-black",
                                  "hover:brightness-110 active:brightness-95"
                                )}
                              >
                                Try again
                              </a>
                              <a
                                href="/"
                                className="inline-flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white/85 hover:bg-white/[0.07] sm:w-auto"
                              >
                                Home
                              </a>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {customerId && (
                    <div className="mt-5 rounded-xl border border-white/10 bg-black/20 p-4">
                      <div className="text-xs text-white/60">Reference</div>
                      <div className="mt-1 font-mono text-xs text-white/85 break-all">{customerId}</div>
                    </div>
                  )}

                  {SHOW_DEBUG && debugJson && (
                    <div className="mt-5 text-left rounded-xl border border-white/10 bg-black/30 p-4">
                      <div className="text-xs text-white/60 mb-2">
                        Debug response from /api/gocardless/complete
                      </div>
                      <pre className="text-xs overflow-auto whitespace-pre-wrap break-words text-white/80">
                        {JSON.stringify(debugJson, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </section>

            <aside className="lg:col-span-5">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
                <div className="text-sm font-semibold">What happens next</div>
                <div className="mt-1 text-xs text-white/60">A quick overview</div>

                <div className="mt-4 space-y-3 text-xs text-white/70">
                  <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                    <div className="font-semibold text-white/85">1) Direct Debit confirmation</div>
                    <div className="mt-1 text-white/60">
                      Banks can take a moment to confirm the mandate. If we’re waiting, this page will retry automatically.
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                    <div className="font-semibold text-white/85">2) Subscription activated</div>
                    <div className="mt-1 text-white/60">
                      Once confirmed, your subscription is created and you’ll receive an email with the details.
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                    <div className="font-semibold text-white/85">3) Monthly billing</div>
                    <div className="mt-1 text-white/60">
                      Monthly payments are taken on the 1st where possible. If you signed up after the 25th, your start date
                      is the 1st of the month after next.
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 text-xs text-white/70">
                  <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <div className="font-semibold text-white/85">Secure</div>
                    <div className="mt-1 text-white/60">GoCardless hosted checkout</div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <div className="font-semibold text-white/85">Flexible</div>
                    <div className="mt-1 text-white/60">Cancel anytime</div>
                  </div>
                </div>
              </div>

              <div className="mt-4 text-center text-xs text-white/40">
                KAB Group. Reliable service, minimal hassle.
              </div>
            </aside>
          </div>
        </div>
      </div>
    </main>
  );
}
