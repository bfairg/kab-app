import { Suspense } from "react";
import LoginClient from "./LoginClient";

function LoginLoading() {
  return <div className="min-h-screen bg-[#070A0F] text-white" />;
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginLoading />}>
      <LoginClient />
    </Suspense>
  );
}
