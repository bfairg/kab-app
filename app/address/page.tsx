"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AddressPage() {
  const router = useRouter();
  const [address1, setAddress1] = useState("");
  const [postcode, setPostcode] = useState("");

  function next() {
    if (!address1 || !postcode) return;

    router.push(
      `/availability?address1=${encodeURIComponent(address1)}&postcode=${encodeURIComponent(postcode)}`
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-4">
        <h1 className="text-2xl font-semibold">Your address</h1>

        <input
          className="w-full rounded border px-3 py-2"
          placeholder="Address"
          value={address1}
          onChange={(e) => setAddress1(e.target.value)}
        />

        <input
          className="w-full rounded border px-3 py-2"
          placeholder="Postcode"
          value={postcode}
          onChange={(e) => setPostcode(e.target.value)}
        />

        <button
          onClick={next}
          className="w-full rounded bg-black py-2 text-white"
        >
          Next
        </button>

        <Link href="/" className="text-sm underline">
          Back
        </Link>
      </div>
    </main>
  );
}
