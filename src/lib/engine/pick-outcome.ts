export type PickResult = "win" | "loss" | "draw";

interface PickInputs {
  team_id: string;
  home_team_id: string;
  away_team_id: string;
  home_score: number | null;
  away_score: number | null;
}

/**
 * Pure outcome for a single pick: the picked team wins if it scored more goals
 * than its opponent, draws on equal, and loses otherwise (including missing
 * scores — a fixture that reaches resolve without scores is treated as a loss).
 */
export function pickOutcome(pick: PickInputs): PickResult {
  const isHome = pick.team_id === pick.home_team_id;
  const own = isHome ? pick.home_score : pick.away_score;
  const opp = isHome ? pick.away_score : pick.home_score;
  if (own === null || opp === null) return "loss";
  if (own > opp) return "win";
  if (own === opp) return "draw";
  return "loss";
}
