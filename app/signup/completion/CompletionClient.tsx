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
  const bypassGc = useMemo(() => sp.get("bypass_gc") === "1", [sp]);

  const hasRun = useRef(false);
  const redirectTimer = useRef<any>(null);

  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState<number>(0);
  const [debugJson, setDebugJson] = useState<any>(null);

  const [claimToken, setClaimToken] = useState<string | null>(null);
  const [emailsSent, setEmailsSent] = useState<boolean>(false);

  const SHOW_DEBUG = process.env.NEXT_PUBLIC_SHOW_CHECKOUT_DEBUG === "true";
  const allowBypass = SHOW_DEBUG && bypassGc;

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
      try {
        // ---------------------------------------------
        // DEV BYPASS: skip GoCardless entirely
        // ---------------------------------------------
        if (allowBypass) {
          setDebugJson({ bypass_gc: true });

          if (!emailsSent) {
            await fetch("/api/notifications/signup-complete", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ customer_id: customerId }),
            });
            setEmailsSent(true);
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
                "Bypass active, but could not prepare account setup."
            );
            return;
          }

          setClaimToken(claimJson.token);
          setStatus("success");

          redirectTimer.current = setTimeout(() => {
            window.location.href = `/signup/account?token=${encodeURIComponent(
              claimJson.token
            )}`;
          }, 4500);

          return;
        }

        // ---------------------------------------------
        // NORMAL GoCardless FLOW
        // ---------------------------------------------
        const maxAttempts = 8;
        const delayMs = 1500;

        for (let i = 1; i <= maxAttempts; i++) {
          setAttempt(i);

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
              await fetch("/api/notifications/signup-complete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ customer_id: customerId }),
              });
              setEmailsSent(true);
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
        }

        setStatus("error");
        setError(
          "Still waiting for Direct Debit confirmation. Please try again."
        );
      } catch (e: any) {
        setStatus("error");
        setError(e?.message || "Something went wrong");
      }
    };

    run();
  }, [customerId, returned, allowBypass, emailsSent]);

  const showNextSteps = status === "pending" || status === "success";

  return (
    <main className="min-h-screen bg-[#070A0F] text-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-xl font-semibold">
          {status === "success" ? "You’re all set" : "Finalising your signup"}
        </h1>

        <p className="mt-2 text-sm text-white/70">
          {allowBypass
            ? "Developer bypass active. No Direct Debit created."
            : "We’re just finishing things up."}
        </p>

        {showNextSteps && (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-6">
            <div className="text-sm font-semibold">What happens next</div>

            <div className="mt-4 space-y-3 text-sm text-white/80">
              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                Your first payment is pro-rata to align with the billing date.
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                Your next clean will appear in the dashboard within 48 hours.
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                You’ll create your login next and then access the dashboard.
              </div>
            </div>

            <div className="mt-5 flex items-center gap-3">
              <a
                href={continueUrl || "#"}
                onClick={(e) => {
                  if (!continueUrl) e.preventDefault();
                }}
                className={cx(
                  "rounded-xl px-4 py-2 text-sm font-semibold",
                  continueUrl
                    ? "bg-white text-black"
                    : "bg-white/20 text-white/60"
                )}
              >
                Continue to account setup
              </a>
            </div>
          </div>
        )}

        {SHOW_DEBUG && debugJson && (
          <pre className="mt-6 text-xs text-white/60">
            {JSON.stringify(debugJson, null, 2)}
          </pre>
        )}
      </div>
    </main>
  );
}
