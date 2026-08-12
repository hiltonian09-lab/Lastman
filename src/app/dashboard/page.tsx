import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { logoutAction } from "../(auth)/actions";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-16">
      <div className="flex items-center justify-between">
        <h1 className="font-[family-name:var(--font-heading)] text-2xl font-semibold">
          Hey, {user.name}
        </h1>
        <form action={logoutAction}>
          <button
            type="submit"
            className="rounded-full border border-border-glass px-4 py-2 text-sm hover:bg-surface-glass"
          >
            Sign out
          </button>
        </form>
      </div>

      <div className="glass-card mt-8 p-6">
        <p className="text-sm text-foreground-muted">
          You&rsquo;re not in any games yet.
        </p>
      </div>
    </div>
  );
}
