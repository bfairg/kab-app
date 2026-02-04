import { redirect } from "next/navigation";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin";

export default async function AdminHomePage() {
  const admin = await requireAdmin();
  if (!admin.ok) redirect("/login?next=/admin");

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-semibold">KAB Admin</h1>
      <p className="mt-2 text-sm text-black/70">
        Manage cleans and mark visits completed or skipped.
      </p>

      <div className="mt-6">
        <Link
          href="/admin/due"
          className="inline-flex rounded-xl border border-black/15 px-4 py-2 font-semibold hover:bg-black/5"
        >
          Open due list
        </Link>
      </div>
    </div>
  );
}
