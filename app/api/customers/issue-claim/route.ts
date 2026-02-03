import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const customerId = (body?.customer_id || "").trim();

  if (!customerId) {
    return NextResponse.json({ error: "Missing customer_id." }, { status: 400 });
  }

  // Service role client, because this is privileged
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const claimToken = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(); // 24 hours

  const { data, error } = await admin
    .from("customers")
    .update({
      claim_token: claimToken,
      claim_token_expires_at: expiresAt,
    })
    .eq("id", customerId)
    .select("id")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Customer not found." }, { status: 404 });
  }

  return NextResponse.json(
    { ok: true, token: claimToken, expires_at: expiresAt },
    { status: 200 }
  );
}
