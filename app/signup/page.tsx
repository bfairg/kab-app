// app/signup/page.tsx
import { Suspense } from "react";
import SignupClient from "./SignupClient";

function SignupLoading() {
  return <div className="min-h-screen bg-[#070A0F] text-white" />;
}

export default function SignupPage() {
  return (
    <Suspense fallback={<SignupLoading />}>
      <SignupClient />
    </Suspense>
  );
}
