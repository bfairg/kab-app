import { Suspense } from "react";
import SignupAccountCompleteClient from "./SignupAccountCompleteClient";

export default function SignupAccountCompletePage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-lg p-6">Finishing setup...</div>}>
      <SignupAccountCompleteClient />
    </Suspense>
  );
}
