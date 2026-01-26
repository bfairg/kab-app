// app/signup/completion/page.tsx

import { Suspense } from "react";
import CompletionClient from "./CompletionClient";

export default function SignupCompletionPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#070A0F] text-white" />}>
      <CompletionClient />
    </Suspense>
  );
}
