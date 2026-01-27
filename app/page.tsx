// app/page.tsx

import Link from "next/link";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-[#070A0F] text-white">
      {/* Background accents (slightly quieter) */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-56 left-1/2 h-[420px] w-[680px] -translate-x-1/2 rounded-full bg-gradient-to-r from-sky-500/14 via-cyan-400/8 to-blue-600/14 blur-3xl" />
        <div className="absolute -bottom-52 right-[-160px] h-[380px] w-[520px] rounded-full bg-gradient-to-tr from-blue-600/14 via-cyan-400/8 to-sky-400/8 blur-3xl" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.05] via-transparent to-transparent" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-5xl items-center px-6 py-12">
        <div className="w-full">
          {/* Header */}
          <header className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/5">
              {/* Optional logo: add file to /public/kab-logo.png to show */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/kab-logo.png"
                alt="KAB Group"
                className="hidden h-full w-full object-cover"
              />
              <span className="text-xs font-semibold text-white/70">KAB</span>
            </div>

            <div className="leading-tight">
              <div className="text-sm text-white/70">KAB Group</div>
              <div className="text-xl font-semibold tracking-tight">
                Bin cleaning, made simple
              </div>
            </div>
          </header>

          {/* Main content */}
          <section className="mt-10 max-w-2xl">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Check availability in your zone
            </h1>

            <p className="mt-3 text-sm text-white/70">
              Enter your address and we’ll confirm your zone and current capacity.
              If there’s space, you can subscribe straight away.
            </p>

            {/* Primary action */}
            <div className="mt-7">
              <Link
                href="/address"
                className={cx(
                  "inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold transition sm:w-auto",
                  "bg-gradient-to-r from-cyan-400 to-sky-500 text-black",
                  "hover:brightness-110 active:brightness-95"
                )}
              >
                Check my address
              </Link>

              {/* Secondary action as a link */}
              <div className="mt-3 text-sm">
                <Link
                  href="/waiting-list"
                  className="text-white/70 underline decoration-white/20 underline-offset-4 hover:text-white hover:decoration-white/40"
                >
                  Zone full? Join the waiting list
                </Link>
              </div>

              <p className="mt-4 text-xs text-white/50">
                Direct Debit checkout is powered by GoCardless.
              </p>
            </div>

            {/* Collapsed help instead of a whole right column */}
            <div className="mt-10">
              <details className="group rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold">How it works</div>
                    <div className="mt-1 text-xs text-white/60">
                      Three quick steps
                    </div>
                  </div>

                  <ChevronDownIcon className="h-5 w-5 text-white/60 transition group-open:rotate-180" />
                </summary>

                <div className="mt-4 space-y-3">
                  <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                    <div className="text-xs text-white/60">Step 1</div>
                    <div className="mt-1 text-sm font-semibold">
                      Check your address
                    </div>
                    <div className="mt-1 text-xs text-white/60">
                      We confirm your zone and current capacity.
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                    <div className="text-xs text-white/60">Step 2</div>
                    <div className="mt-1 text-sm font-semibold">
                      Confirm availability
                    </div>
                    <div className="mt-1 text-xs text-white/60">
                      If your zone is full, join the waiting list.
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                    <div className="text-xs text-white/60">Step 3</div>
                    <div className="mt-1 text-sm font-semibold">
                      Subscribe when space opens
                    </div>
                    <div className="mt-1 text-xs text-white/60">
                      Set up Direct Debit securely and start your monthly plan.
                    </div>
                  </div>

                  <div className="pt-2 text-xs text-white/60">
                    Transparent pricing. Secure checkout.
                  </div>
                </div>
              </details>

              <div className="mt-5 text-xs text-white/40">
                KAB Group. Reliable service, minimal hassle.
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
