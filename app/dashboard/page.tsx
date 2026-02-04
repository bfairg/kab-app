export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";

function label(v: any) {
  const s = (v ?? "").toString().trim();
  return s ? s : "Not set";
}

function formatDate(v: any) {
  if (!v) return "Not set";
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return "Not set";
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

export default async function DashboardPage() {
  const supabase = await createSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: customer } = await supabase
    .from("customers")
    .select(
      "id, full_name, email, mobile, postcode, town, address_line_1, address_line_2, plan, status, payment_status, gc_mandate_id, created_at, last_cleaned_at"
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (!customer) redirect("/login");

  // Next scheduled: from your view
  const { data: nextDue } = await supabase
    .from("v_cleaning_next_due")
    .select("due_date, bin_colour, week_includes_green")
    .eq("customer_id", customer.id)
    .maybeSingle();

  // Last cleaned fallback: latest cleaning_visits entry (only used if last_cleaned_at is null)
  // NOTE: change "cleaned_at" below if your timestamp column is named differently.
  const { data: lastVisit } = await supabase
    .from("cleaning_visits")
    .select("cleaned_at")
    .eq("customer_id", customer.id)
    .order("cleaned_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const lastCleanedRaw = customer.last_cleaned_at ?? lastVisit?.cleaned_at ?? null;
  const lastCleanedLabel = lastCleanedRaw ? formatDate(lastCleanedRaw) : "Not cleaned yet";

  const nextScheduledLabel = nextDue?.due_date ? formatDate(nextDue.due_date) : "Not scheduled";

  const nextHintParts: string[] = [];
  if (nextDue?.bin_colour) nextHintParts.push(`${nextDue.bin_colour} bin`);
  if (nextDue?.week_includes_green) nextHintParts.push("includes green");
  const nextHint = nextHintParts.length ? nextHintParts.join(" • ") : "";

  return (
    <main className="min-h-[calc(100vh-72px)] bg-[#070A0F] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-48 left-1/2 h-[520px] w-[780px] -translate-x-1/2 rounded-full bg-gradient-to-r from-sky-500/20 via-cyan-400/10 to-blue-600/20 blur-3xl" />
        <div className="absolute -bottom-40 right-[-120px] h-[420px] w-[520px] rounded-full bg-gradient-to-tr from-blue-600/20 via-cyan-400/10 to-sky-400/10 blur-3xl" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.06] via-transparent to-transparent" />
      </div>

      <div className="relative mx-auto w-full max-w-6xl px-6 py-10">
        <div className="flex flex-col gap-2">
          <div className="text-sm text-white/70">Dashboard</div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Welcome{customer.full_name ? `, ${customer.full_name}` : ""}
          </h1>
          <p className="text-sm text-white/70">Your subscription details and service info.</p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
          <section className="lg:col-span-7">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
              <div className="border-b border-white/10 p-6">
                <div className="text-sm font-semibold">Subscription</div>
                <div className="mt-1 text-xs text-white/60">
                  Current plan, payment status, and schedule
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                    <div className="text-xs text-white/60">Plan</div>
                    <div className="mt-1 text-sm font-semibold text-white/85">{label(customer.plan)}</div>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                    <div className="text-xs text-white/60">Payment status</div>
                    <div className="mt-1 text-sm font-semibold text-white/85">{label(customer.payment_status)}</div>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                    <div className="text-xs text-white/60">Account status</div>
                    <div className="mt-1 text-sm font-semibold text-white/85">{label(customer.status)}</div>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                    <div className="text-xs text-white/60">Customer reference</div>
                    <div className="mt-1 font-mono text-xs text-white/80 break-all">{label(customer.id)}</div>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                    <div className="text-xs text-white/60">Last cleaned</div>
                    <div className="mt-1 text-sm font-semibold text-white/85">{lastCleanedLabel}</div>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                    <div className="text-xs text-white/60">Next scheduled</div>
                    <div className="mt-1 text-sm font-semibold text-white/85">{nextScheduledLabel}</div>
                    {nextHint ? <div className="mt-1 text-xs text-white/60">{nextHint}</div> : null}
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="text-xs text-white/60">Direct Debit</div>
                  <div className="mt-1 text-sm text-white/80">
                    Mandate: <span className="font-mono">{label(customer.gc_mandate_id)}</span>
                  </div>
                </div>

                <div className="text-xs text-white/50">
                  More dashboard features will go here: service history, skip requests, add-ons.
                </div>
              </div>
            </div>
          </section>

          <aside className="lg:col-span-5">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
              <div className="text-sm font-semibold">Service address</div>
              <div className="mt-1 text-xs text-white/60">Details on file</div>

              <div className="mt-4 space-y-3 text-sm text-white/80">
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="text-xs text-white/60">Address</div>
                  <div className="mt-1">
                    {label(customer.address_line_1)}
                    {customer.address_line_2 ? <div>{customer.address_line_2}</div> : null}
                    <div>{label(customer.town)}</div>
                    <div className="font-semibold">{label(customer.postcode)}</div>
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="text-xs text-white/60">Contact</div>
                  <div className="mt-1">{label(customer.email)}</div>
                  <div className="mt-1">{label(customer.mobile)}</div>
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
