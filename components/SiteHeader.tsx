import LogoutButton from "@/components/LogoutButton";
import { createSupabaseServer } from "@/lib/supabase/server";

export default async function SiteHeader() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#070A0F]/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <a href="/" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/kab-logo.png" alt="KAB Group" className="h-full w-full object-cover" />
          </div>
          <div className="leading-tight">
            <div className="text-sm text-white/70">KAB Group</div>
          </div>
        </a>

        <nav className="flex items-center gap-2">
          {user ? (
            <>
              <a
                href="/dashboard"
                className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white/85 hover:bg-white/[0.07]"
              >
                Dashboard
              </a>
              <LogoutButton />
            </>
          ) : (
            <>
              <a
                href="/login"
                className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white/85 hover:bg-white/[0.07]"
              >
                Sign in
              </a>
              <a
                href="/address"
                className="rounded-xl bg-gradient-to-r from-cyan-400 to-sky-500 px-3 py-2 text-xs font-semibold text-black hover:brightness-110"
              >
                Check availability
              </a>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
