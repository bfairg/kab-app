import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const token = (body?.token || "").trim();

  if (!token) {
    return NextResponse.json({ error: "Missing token." }, { status: 400 });
  }

  // Session-aware server client (reads the logged in user from cookies)
  const supabaseAuth = await createSupabaseServer();
  const { data: userData, error: userError } = await supabaseAuth.auth.getUser();

  if (userError || !userData.user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const userId = userData.user.id;

  // Admin client to perform privileged claim update
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data: updated, error: updateError } = await admin
    .from("customers")
    .update({
      user_id: userId,
      claim_token: null,
      claim_token_expires_at: null,
    })
    .eq("claim_token", token)
    .gt("claim_token_expires_at", new Date().toISOString())
    .is("user_id", null)
    .select("id")
    .maybeSingle();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  if (!updated) {
    return NextResponse.json(
      { error: "Token invalid, expired, or already claimed." },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true, customer_id: updated.id }, { status: 200 });
}
