// app/page.tsx

import Link from "next/link";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function Home() {
  return (
    <main className="min-h-screen bg-[#070A0F] text-white">
      {/* Background accents */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-48 left-1/2 h-[520px] w-[780px] -translate-x-1/2 rounded-full bg-gradient-to-r from-sky-500/20 via-cyan-400/10 to-blue-600/20 blur-3xl" />
        <div className="absolute -bottom-40 right-[-120px] h-[420px] w-[520px] rounded-full bg-gradient-to-tr from-blue-600/20 via-cyan-400/10 to-sky-400/10 blur-3xl" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.06] via-transparent to-transparent" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center px-6 py-10">
        <div className="grid w-full grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Left: hero */}
          <section className="lg:col-span-7">
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
                <div className="text-xl font-semibold tracking-tight">Bin cleaning, made simple</div>
              </div>
            </header>

            <h1 className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">
              Check availability in your zone
            </h1>

            <p className="mt-3 max-w-xl text-sm text-white/70">
              Start by entering your address. We’ll confirm your zone and current capacity, then guide you through
              subscription when space is available.
            </p>

            <div className="mt-6 flex flex-wrap gap-2 text-xs text-white/70">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Local service</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Reliable monthly cycle</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Eco minded approach</span>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
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

              <Link
                href="/waiting-list"
                className={cx(
                  "inline-flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white transition sm:w-auto",
                  "hover:bg-white/[0.07]"
                )}
              >
                Join waiting list
              </Link>
            </div>

            <p className="mt-5 text-xs text-white/50">
              Direct Debit sign-up is available when your zone has space.
            </p>
          </section>

          {/* Right: info cards */}
          <aside className="lg:col-span-5">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
              <div className="text-sm font-semibold">How it works</div>
              <div className="mt-1 text-xs text-white/60">Three quick steps</div>

              <div className="mt-4 space-y-3">
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="text-xs text-white/60">Step 1</div>
                  <div className="mt-1 text-sm font-semibold">Check your address</div>
                  <div className="mt-1 text-xs text-white/60">We confirm your zone and current capacity.</div>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="text-xs text-white/60">Step 2</div>
                  <div className="mt-1 text-sm font-semibold">Confirm availability</div>
                  <div className="mt-1 text-xs text-white/60">If your zone is full, you can join the waiting list.</div>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="text-xs text-white/60">Step 3</div>
                  <div className="mt-1 text-sm font-semibold">Subscribe when space opens</div>
                  <div className="mt-1 text-xs text-white/60">
                    Set up Direct Debit securely and start your monthly plan.
                  </div>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 text-xs text-white/70">
                <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <div className="font-semibold text-white/85">Transparent</div>
                  <div className="mt-1 text-white/60">Clear pricing</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <div className="font-semibold text-white/85">Secure</div>
                  <div className="mt-1 text-white/60">GoCardless checkout</div>
                </div>
              </div>
            </div>

            <div className="mt-4 text-center text-xs text-white/40">
              KAB Group. Reliable service, minimal hassle.
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
