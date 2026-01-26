// app/availability/page.tsx

import { Suspense } from "react";
import AvailabilityClient from "./AvailabilityClient";

export default function AvailabilityPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#070A0F] text-white" />}>
      <AvailabilityClient />
    </Suspense>
  );
}
