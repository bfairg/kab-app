// app/waiting-list/page.tsx
import { Suspense } from "react";
import WaitingListClient from "./WaitingListClient";

export default function WaitingListPage() {
  return (
    <Suspense fallback={<WaitingListLoading />}>
      <WaitingListClient />
    </Suspense>
  );
}

function WaitingListLoading() {
  return (
    <main className="min-h-screen bg-[#070A0F] text-white">
      <div className="relative mx-auto w-full max-w-6xl px-6 py-10">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
          <div className="text-sm font-semibold">Loading</div>
          <div className="mt-2 text-sm text-white/70">
            Preparing the waiting list form
          </div>

          <div className="mt-6 flex items-center gap-3">
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-white/20 border-t-cyan-300" />
            <div className="text-xs text-white/60">Just a moment.</div>
          </div>
        </div>
      </div>
    </main>
  );
}
