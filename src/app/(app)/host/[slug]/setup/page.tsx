import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getGameBySlug } from "@/lib/db/games";
import { retryAdminFeePaymentAction } from "../../actions";

export default async function GameSetupPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const game = await getGameBySlug(slug);
  if (!game || game.owner_id !== user.id) redirect("/dashboard");
  if (game.status !== "draft") redirect(`/host/${slug}`);

  const retryWithSlug = retryAdminFeePaymentAction.bind(null, slug);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <h1 className="font-[family-name:var(--font-heading)] text-2xl font-semibold">
        &ldquo;{game.name}&rdquo; isn&rsquo;t open yet
      </h1>
      <p className="mt-2 text-sm text-foreground-muted">
        Payment was cancelled before it completed. Pay the admin fee to open
        the game and get your invite code.
      </p>

      <form action={retryWithSlug} className="mt-8">
        <button
          type="submit"
          className="rounded-full bg-royal-blue px-6 py-3 font-medium text-white transition-colors hover:bg-royal-blue-deep"
        >
          Pay admin fee &amp; open game
        </button>
      </form>
    </div>
  );
}
