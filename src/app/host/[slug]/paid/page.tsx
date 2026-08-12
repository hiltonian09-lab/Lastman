import { redirect } from "next/navigation";
import Link from "next/link";
import { reconcileMinimumFeeSession } from "@/lib/stripe/admin-fee-checkout";
import { getGameBySlug } from "@/lib/db/games";
import { getOrigin } from "@/lib/http/origin";
import { InviteLink } from "../invite-link";

export default async function GamePaidPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { slug } = await params;
  const { session_id: sessionId } = await searchParams;

  if (!sessionId) redirect(`/host/${slug}/setup`);

  const { paid } = await reconcileMinimumFeeSession(sessionId);
  const game = await getGameBySlug(slug);
  if (!game) redirect("/dashboard");

  if (!paid && game.status === "draft") redirect(`/host/${slug}/setup`);

  const origin = await getOrigin();

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-3 h-2 w-2 rounded-full bg-status-alive" />
      <h1 className="font-[family-name:var(--font-heading)] text-3xl font-semibold">
        &ldquo;{game.name}&rdquo; is open
      </h1>
      <p className="mt-2 text-sm text-foreground-muted">
        Share this link with your players to get them in.
      </p>

      <div className="mt-8 w-full text-left">
        <InviteLink code={game.invite_code ?? ""} origin={origin} />
      </div>

      <Link
        href={`/host/${slug}`}
        className="mt-8 rounded-full bg-royal-blue px-6 py-3 font-medium text-white transition-colors hover:bg-royal-blue-deep"
      >
        Go to game dashboard
      </Link>
    </div>
  );
}
