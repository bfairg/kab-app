import { supabaseServer } from "@/lib/supabase/server";

export async function requireAdmin() {
  const supabase = supabaseServer();

  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr || !authData?.user) return { ok: false as const };

  const userId = authData.user.id;

  const { data: adminRow, error: adminErr } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (adminErr || !adminRow) return { ok: false as const };

  return { ok: true as const, user: authData.user };
}
