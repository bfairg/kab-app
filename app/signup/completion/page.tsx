export const dynamic = "force-dynamic";

import { Suspense } from "react";
import CompletionClient from "./CompletionClient";
import { redirectIfCustomerClaimed } from "@/lib/guards/redirectIfCustomerClaimed";

function CompletionLoading() {
  return <div className="min-h-screen bg-[#070A0F] text-white" />;
}

type PageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

function getParam(
  searchParams: PageProps["searchParams"],
  key: string
): string {
  const v = searchParams?.[key];
  if (Array.isArray(v)) return (v[0] || "").trim();
  return (v || "").trim();
}

export default async function SignupCompletionPage({ searchParams }: PageProps) {
  const showDebug = process.env.NEXT_PUBLIC_SHOW_CHECKOUT_DEBUG === "true";
  const bypassGc = getParam(searchParams, "bypass_gc") === "1";

  // When doing a debug bypass, we need to allow the page to render even if
  // the usual guard would redirect/notFound.
  if (!(showDebug && bypassGc)) {
    await redirectIfCustomerClaimed();
  }

  return (
    <Suspense fallback={<CompletionLoading />}>
      <CompletionClient />
    </Suspense>
  );
}
