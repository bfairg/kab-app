// app/availability/address/page.tsx

import Link from "next/link";

export default function AvailabilityAddressPage() {
  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ fontSize: 24, marginBottom: 12 }}>Availability Address</h1>
      <p style={{ marginBottom: 16 }}>
        This page is live as a placeholder so the build can succeed.
      </p>

      <Link href="/availability" style={{ textDecoration: "underline" }}>
        Back to availability
      </Link>
    </main>
  );
}
