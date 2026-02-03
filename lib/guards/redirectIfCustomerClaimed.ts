import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function redirectIfCustomerClaimed() {
  const supabase = await createSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Not logged in
  if (!user) return;

  const { data: customer, error } = await supabase
    .from("customers")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  // If RLS or query fails, do not block
  if (error) return;

  // Customer already claimed
  if (customer?.id) {
    redirect("/dashboard");
  }
}
