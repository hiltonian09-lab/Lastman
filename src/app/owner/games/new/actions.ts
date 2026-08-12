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
  const leagueIds = formData.getAll("leagueIds").map(String);
  const maxPlayersRaw = String(formData.get("maxPlayers") ?? "").trim();
  const lives = Number(formData.get("lives") ?? 0);
  const missedPickPolicy = String(
    formData.get("missedPickPolicy") ?? "lowest_alphabetical",
  ) as GameRules["missedPickPolicy"];

  if (!name) return { error: "Give the game a name." };
  if (leagueIds.length === 0) return { error: "Select at least one league." };
  if (![0, 1, 2, 3].includes(lives)) return { error: "Lives must be between 0 and 3." };

  const maxPlayers = maxPlayersRaw ? parseInt(maxPlayersRaw, 10) : null;
  if (maxPlayersRaw && (!Number.isInteger(maxPlayers) || (maxPlayers as number) < 2)) {
    return { error: "Max players must be a whole number of 2 or more." };
  }

  const rules: GameRules = { lives, missedPickPolicy, tiebreaker: "split" };

  const game = await createOfficialGame({
    ownerId: user.id,
    name,
    leagueIds,
    maxPlayers,
    rules,
  });

  redirect(`/host/${game.slug}`);
}
