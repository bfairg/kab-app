export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import SignupAccountClient from "./SignupAccountClient";
import { redirectIfCustomerClaimed } from "@/lib/guards/redirectIfCustomerClaimed";
import { createClient } from "@supabase/supabase-js";

type Props = {
  searchParams: Record<string, string | string[] | undefined>;
};

export default async function SignupAccountPage({ searchParams }: Props) {
  await redirectIfCustomerClaimed();

  const tokenRaw = searchParams.token;
  const token = Array.isArray(tokenRaw) ? (tokenRaw[0] || "").trim() : (tokenRaw || "").trim();

  if (!token) {
    redirect("/signup");
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const nowIso = new Date().toISOString();

  const { data: customer, error } = await admin
    .from("customers")
    .select("email, full_name, user_id, claim_token_expires_at")
    .eq("claim_token", token)
    .gt("claim_token_expires_at", nowIso)
    .maybeSingle();

  if (error || !customer) {
    redirect("/signup");
  }

  if (customer.user_id) {
    redirect("/dashboard");
  }

  return (
    <SignupAccountClient
      token={token}
      initialEmail={(customer.email || "").trim()}
      initialName={(customer.full_name || "").trim()}
    />
  );
}
