import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function redirectIfCustomerClaimed() {
  const supabase = await createSupabaseServer();

  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;

  if (!user) return;

  const { data: customer, error } = await supabase
    .from("customers")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  // If the table query fails for any reason, do not block the page.
  // This avoids redirect loops if schema changes temporarily.
  if (error) return;

  if (customer?.id) {
    redirect("/dashboard");
  }
}
