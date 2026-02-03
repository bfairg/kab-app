import { Suspense } from "react";
import SignupAccountClient from "./SignupAccountClient";

export default function SignupAccountPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-lg p-6">Loading...</div>}>
      <SignupAccountClient />
    </Suspense>
  );
}
