import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold">KAB Group</h1>
          <p className="text-sm text-neutral-600">
            Check availability in your zone, then sign up when space opens.
          </p>
        </div>

        <div className="rounded-xl border p-4 space-y-3">
          <p className="text-sm">
            Start by entering your address so we can check the zone.
          </p>
          <Link
            href="/address"
            className="inline-flex w-full items-center justify-center rounded-lg bg-black px-4 py-2 text-white"
          >
            Check my address
          </Link>
        </div>

        <p className="text-xs text-neutral-500">
          This is the early access portal. We’ll add sign-up and Direct Debit next.
        </p>
      </div>
    </main>
  );
}
