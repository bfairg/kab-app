// app/waiting-list/page.tsx
import { Suspense } from "react";
import WaitingListClient from "./WaitingListClient";

export default function WaitingListPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#070A0F]" />}>
      <WaitingListClient />
    </Suspense>
  );
}
