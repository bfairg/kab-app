import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function redirectIfCustomerClaimed() {
  const supabase = await createSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Not logged in at all
  if (!user) return;

  const { data: customer, error } = await supabase
    .from("customers")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  // If query fails, do nothing to avoid loops
  if (error) return;

  // Customer already claimed → dashboard
  if (customer?.id) {
    redirect("/dashboard");
  }
}
