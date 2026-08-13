import type { AdminFeeConfig } from "./db/admin-fee";

export interface PrizeConfig {
  entryFeeCents: number;
  prizeFundPercent: number;
  splitPercents: number[];
  boobyPercent: number;
}

export const DEFAULT_PRIZE_CONFIG: PrizeConfig = {
  entryFeeCents: 1000,
  prizeFundPercent: 75,
  splitPercents: [100],
  boobyPercent: 0,
};

export interface PrizeBreakdown {
  totalFundCents: number;
  prizeFundCents: number;
  grossProfitCents: number;
  placePayoutsCents: number[];
  boobyPrizeCents: number;
}

/** Total fund is projected from the configured entry fee × current headcount — this
 * platform never collects or tracks the actual entry-fee payments, so it's an
 * estimate the organiser can act on, not a reconciled ledger. */
export function calculatePrizeBreakdown(
  config: PrizeConfig,
  playerCount: number,
): PrizeBreakdown {
  const totalFundCents = config.entryFeeCents * playerCount;
  const prizeFundCents = Math.round((totalFundCents * config.prizeFundPercent) / 100);
  const grossProfitCents = totalFundCents - prizeFundCents;
  const placePayoutsCents = config.splitPercents.map((pct) =>
    Math.round((prizeFundCents * pct) / 100),
  );
  const boobyPrizeCents = Math.round((prizeFundCents * config.boobyPercent) / 100);

  return { totalFundCents, prizeFundCents, grossProfitCents, placePayoutsCents, boobyPrizeCents };
}

/** Platform cost is the minimum fee plus whatever balance the per-player rate
 * exceeds it by — mirrors the exact formula chargeBalanceIfDue uses to charge it. */
export function calculatePlatformCostCents(
  playerCount: number,
  feeConfig: AdminFeeConfig,
): number {
  return Math.max(feeConfig.minimum_fee_cents, playerCount * feeConfig.per_player_fee_cents);
}

export function calculateNetProfitCents(
  grossProfitCents: number,
  playerCount: number,
  feeConfig: AdminFeeConfig,
): number {
  return grossProfitCents - calculatePlatformCostCents(playerCount, feeConfig);
}

export function parsePrizeSplits(json: string | null): number[] | null {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed) || !parsed.every((n) => typeof n === "number")) return null;
    return parsed;
  } catch {
    return null;
  }
}

export interface ParsedPrizeForm {
  prizeFundPercent: number;
  prizePlaces: number;
  prizeSplits: number[];
  boobyPrizePercent: number;
}

/**
 * Shared by game creation and settings — the owner types every place's
 * percentage themselves, so the only invariant worth enforcing is that the
 * place splits plus the booby prize add up to exactly 100% of the prize
 * fund (not the total fund — prizeFundPercent controls that separately).
 */
export function parsePrizeForm(formData: FormData): ParsedPrizeForm | { error: string } {
  const prizeFundPercent = Number(formData.get("prizeFundPercent") ?? 75);
  if (!Number.isFinite(prizeFundPercent) || prizeFundPercent < 0 || prizeFundPercent > 100) {
    return { error: "Prize fund % must be between 0 and 100." };
  }

  const prizePlaces = Number(formData.get("prizePlaces") ?? 1);
  if (![1, 2, 3].includes(prizePlaces)) {
    return { error: "Paid places must be 1, 2, or 3." };
  }

  const prizeSplits: number[] = [];
  for (let i = 1; i <= prizePlaces; i++) {
    const raw = Number(formData.get(`prizeSplit${i}`) ?? 0);
    if (!Number.isFinite(raw) || raw < 0 || raw > 100) {
      return { error: `Place ${i}'s split must be between 0 and 100.` };
    }
    prizeSplits.push(raw);
  }

  const boobyEnabled = formData.get("boobyPrizeEnabled") === "on";
  const boobyPrizePercent = boobyEnabled ? Number(formData.get("boobyPrizePercent") ?? 0) : 0;
  if (!Number.isFinite(boobyPrizePercent) || boobyPrizePercent < 0 || boobyPrizePercent > 100) {
    return { error: "Booby prize % must be between 0 and 100." };
  }

  const total = prizeSplits.reduce((a, b) => a + b, 0) + boobyPrizePercent;
  if (total !== 100) {
    return {
      error: `Place splits and the booby prize must add up to 100% of the prize fund (currently ${total}%).`,
    };
  }

  return { prizeFundPercent, prizePlaces, prizeSplits, boobyPrizePercent };
}
