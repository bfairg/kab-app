export const dynamic = "force-dynamic";

import { Suspense } from "react";
import SignupClient from "./SignupClient";
import { redirectIfCustomerClaimed } from "@/lib/guards/redirectIfCustomerClaimed";

function SignupLoading() {
  return <div className="min-h-screen bg-[#070A0F] text-white" />;
}

export default async function SignupPage() {
  await redirectIfCustomerClaimed();

  return (
    <Suspense fallback={<SignupLoading />}>
      <SignupClient />
    </Suspense>
  );
}
