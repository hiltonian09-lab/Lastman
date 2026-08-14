"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { createOfficialGame, type GameRules } from "@/lib/db/games";

export interface OfficialGameFormState {
  error?: string;
}

export async function createOfficialGameAction(
  _prevState: OfficialGameFormState,
  formData: FormData,
): Promise<OfficialGameFormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "platform_owner") redirect("/dashboard");

  const name = String(formData.get("name") ?? "").trim();
  const leagueId = String(formData.get("leagueId") ?? "").trim();
  const maxPlayersRaw = String(formData.get("maxPlayers") ?? "").trim();
  const lives = Number(formData.get("lives") ?? 0);
  const missedPickPolicy = String(
    formData.get("missedPickPolicy") ?? "lowest_alphabetical",
  ) as GameRules["missedPickPolicy"];
  const startsAtRaw = String(formData.get("startsAt") ?? "").trim();

  if (!name) return { error: "Give the game a name." };
  if (!leagueId) return { error: "Select a league." };
  if (![0, 1, 2, 3].includes(lives)) return { error: "Lives must be between 0 and 3." };
  if (startsAtRaw && Number.isNaN(Date.parse(startsAtRaw))) {
    return { error: "Start date isn't valid." };
  }

  const maxPlayers = maxPlayersRaw ? parseInt(maxPlayersRaw, 10) : null;
  if (maxPlayersRaw && (!Number.isInteger(maxPlayers) || (maxPlayers as number) < 2)) {
    return { error: "Max players must be a whole number of 2 or more." };
  }

  const rules: GameRules = { lives, missedPickPolicy, tiebreaker: "split" };

  const game = await createOfficialGame({
    ownerId: user.id,
    name,
    leagueIds: [leagueId],
    maxPlayers,
    rules,
    startsAt: startsAtRaw ? new Date(startsAtRaw).toISOString() : null,
  });

  redirect(`/host/${game.slug}`);
}
