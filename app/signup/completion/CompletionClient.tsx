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
            // 👉 NEW STEP: issue claim token for account creation
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

            // 👉 Redirect into account creation flow
            window.location.href = `/signup/account?token=${encodeURIComponent(
              claimJson.token
            )}`;
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
  }, [customerId, returned]);

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
        title: "All set",
        subtitle:
          "Your Direct Debit is active. Redirecting you to finish account setup.",
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
      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center px-6 py-10">
        <div className="w-full">
          <h1 className="text-xl font-semibold">{header.title}</h1>
          <p className="mt-2 text-sm text-white/70">{header.subtitle}</p>

          {status === "pending" && (
            <p className="mt-4 text-sm text-white/60">
              Attempt {attempt} of 8. Please wait…
            </p>
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
