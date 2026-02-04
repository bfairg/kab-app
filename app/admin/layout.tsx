// app/admin/layout.tsx
import type { ReactNode } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen">
      {/* Background layer to match the rest of the app */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        {/* Base */}
        <div className="absolute inset-0 bg-[#070A0F]" />

        {/* Soft brand glow (teal + navy) */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(1200px 700px at 18% 10%, rgba(11,181,193,0.18), transparent 60%)," +
              "radial-gradient(1100px 700px at 85% 0%, rgba(21,62,110,0.25), transparent 62%)," +
              "radial-gradient(900px 600px at 50% 110%, rgba(255,255,255,0.06), transparent 70%)",
          }}
        />

        {/* Subtle vignette */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.10), rgba(0,0,0,0.65))",
          }}
        />
      </div>

      {children}
    </div>
  );
}
