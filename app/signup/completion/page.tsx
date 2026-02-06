export const dynamic = "force-dynamic";

import { Suspense } from "react";
import CompletionClient from "./CompletionClient";
import { redirectIfCustomerClaimed } from "@/lib/guards/redirectIfCustomerClaimed";

function CompletionLoading() {
  return <div className="min-h-screen bg-[#070A0F] text-white" />;
}

type SearchParamsValue = string | string[] | undefined;

type PageProps = {
  searchParams?:
    | Record<string, SearchParamsValue>
    | Promise<Record<string, SearchParamsValue>>;
};

function getParam(
  sp: Record<string, SearchParamsValue> | undefined,
  key: string
): string {
  const v = sp?.[key];
  if (Array.isArray(v)) return (v[0] || "").trim();
  return (v || "").trim();
}

export default async function SignupCompletionPage(props: PageProps) {
  const sp = await Promise.resolve(props.searchParams);

  const bypassGc = getParam(sp, "bypass_gc") === "1";
  const bypassSecret = getParam(sp, "bypass_secret");

  const required = (process.env.SIGNUP_BYPASS_SECRET || "").trim();
  const bypassAllowed = !!required && bypassGc && bypassSecret === required;

  // Only skip guard when the bypass secret matches
  if (!bypassAllowed) {
    await redirectIfCustomerClaimed();
  }

  return (
    <Suspense fallback={<CompletionLoading />}>
      <CompletionClient />
    </Suspense>
  );
}
