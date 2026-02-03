import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createSupabaseServer();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    redirect("/signup/account");
  }

  // RLS should ensure they only see their own row via customers.user_id = auth.uid()
  const { data: customer, error } = await supabase
    .from("customers")
    .select("full_name, postcode, status, payment_status")
    .maybeSingle();

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold">Your dashboard</h1>

      {error && (
        <p className="mt-4 text-sm text-red-600">
          {error.message}
        </p>
      )}

      {!customer ? (
        <p className="mt-4 text-sm text-black/70">
          Signed in, but no customer record is linked to this account yet.
        </p>
      ) : (
        <div className="mt-6 rounded-xl border p-5">
          <p className="text-sm"><strong>Name:</strong> {customer.full_name || "—"}</p>
          <p className="mt-2 text-sm"><strong>Postcode:</strong> {customer.postcode || "—"}</p>
          <p className="mt-2 text-sm"><strong>Status:</strong> {customer.status || "—"}</p>
          <p className="mt-2 text-sm"><strong>Payment:</strong> {customer.payment_status || "—"}</p>
        </div>
      )}
    </main>
  );
}
