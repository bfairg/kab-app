export const dynamic = "force-dynamic";

import { Suspense } from "react";
import CompletionClient from "./CompletionClient";
import { redirectIfCustomerClaimed } from "@/lib/guards/redirectIfCustomerClaimed";

function CompletionLoading() {
  return <div className="min-h-screen bg-[#070A0F] text-white" />;
}

export default async function SignupCompletionPage() {
  await redirectIfCustomerClaimed();

  return (
    <Suspense fallback={<CompletionLoading />}>
      <CompletionClient />
    </Suspense>
  );
}
