export const dynamic = "force-dynamic";

import { Suspense } from "react";
import SignupAccountClient from "./SignupAccountClient";
import { redirectIfCustomerClaimed } from "@/lib/guards/redirectIfCustomerClaimed";

function AccountLoading() {
  return <div className="min-h-screen bg-[#070A0F] text-white" />;
}

export default async function SignupAccountPage() {
  await redirectIfCustomerClaimed();

  return (
    <Suspense fallback={<AccountLoading />}>
      <SignupAccountClient />
    </Suspense>
  );
}
