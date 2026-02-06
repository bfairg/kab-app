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
  const redirectTimer = useRef<any>(null);

  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState<number>(0);
  const [debugJson, setDebugJson] = useState<any>(null);

  const [claimToken, setClaimToken] = useState<string | null>(null);
  const [emailsSent, setEmailsSent] = useState<boolean>(false);

  const SHOW_DEBUG = process.env.NEXT_PUBLIC_SHOW_CHECKOUT_DEBUG === "true";

  const continueUrl = useMemo(() => {
    if (!claimToken) return null;
    return `/signup/account?token=${encodeURIComponent(claimToken)}`;
  }, [claimToken]);

  useEffect(() => {
    return () => {
      if (redirectTimer.current) clearTimeout(redirectTimer.current);
    };
  }, []);

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

            if (!emailsSent) {
              try {
                await fetch("/api/notifications/signup-complete", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ customer_id: customerId }),
                });
                setEmailsSent(true);
              } catch {
                // Intentionally ignore email failures so signup flow is not blocked
              }
            }

            const claimRes = await fetch("/api/customers/issue-claim", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ customer_id: customerId }),
            });

            const claimJson = await claimRes.json().catch(() => ({}));

            if (!claimRes.ok || !claimJson?.token) {
              setStatus("error");
              setError(
                claimJson?.error ||
                  "Direct Debit is active, but we could not prepare account setup."
              );
              return;
            }

            setClaimToken(claimJson.token);

            redirectTimer.current = setTimeout(() => {
              window.location.href = `/signup/account?token=${encodeURIComponent(
                claimJson.token
              )}`;
            }, 4500);

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
      setError(
        "Still waiting for Direct Debit confirmation. Please try again in a minute."
      );
    };

    run();
  }, [customerId, returned, emailsSent]);

  const header = useMemo(() => {
    if (status === "idle") {
      return {
        title: "Almost done",
        subtitle:
          "Please return to the signup page and complete the Direct Debit setup.",
        tone: "neutral" as const,
      };
    }
    if (status === "pending") {
      return {
        title: "Finalising your signup",
        subtitle:
          "We’re waiting for Direct Debit confirmation from the bank. This can take a moment.",
        tone: "pending" as const,
      };
    }
    if (status === "success") {
      return {
        title: "You’re all set",
        subtitle:
          "Next steps are below. We’ll continue to account setup in a moment.",
        tone: "success" as const,
      };
    }
    return {
      title: "We need to take a look",
      subtitle: error || "Something went wrong.",
      tone: "error" as const,
    };
  }, [status, error]);

  const showNextSteps = status === "success" || status === "pending";

  return (
    <main className="min-h-screen bg-[#070A0F] text-white">
      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center px-6 py-10">
        <div className="w-full">
          <h1 className="text-xl font-semibold">{header.title}</h1>
          <p className="mt-2 text-sm text-white/70">{header.subtitle}</p>

          {status === "pending" && (
            <p className="mt-4 text-sm text-white/60">
              Attempt {attempt} of 8. Please wait…
            </p>
          )}

          {showNextSteps && (
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
              <div className="text-sm font-semibold">What happens next</div>
              <div className="mt-1 text-xs text-white/60">
                Quick, clear, and no fuss
              </div>

              <div className="mt-4 space-y-3 text-sm text-white/80">
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="text-xs text-white/60">Pro-rata payment</div>
                  <div className="mt-1">
                    Your first Direct Debit is a pro-rata amount to align you to
                    the normal billing date.
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="text-xs text-white/60">Next clean date</div>
                  <div className="mt-1">
                    Your next clean will appear in your dashboard within 48
                    hours.
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="text-xs text-white/60">Dashboard access</div>
                  <div className="mt-1">
                    You’ll create your login next. After that, you can sign in
                    anytime and view your service schedule on the dashboard.
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                <a
                  href={continueUrl || "#"}
                  onClick={(e) => {
                    if (!continueUrl) e.preventDefault();
                  }}
                  className={cx(
                    "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold",
                    continueUrl
                      ? "bg-white text-black hover:opacity-95"
                      : "bg-white/20 text-white/60 cursor-not-allowed"
                  )}
                >
                  Continue to account setup
                </a>

                {status === "success" ? (
                  <div className="text-xs text-white/50">
                    Continuing automatically in a moment…
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
              <p className="text-sm text-red-200">{error}</p>
            </div>
          )}

          {SHOW_DEBUG && debugJson && (
            <pre className="mt-6 text-xs text-white/70">
              {JSON.stringify(debugJson, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </main>
  );
}
