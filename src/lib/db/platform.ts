import { getEnv } from "@/lib/cloudflare";

export interface PlatformStats {
  totalUsers: number;
  totalGames: number;
  activeGames: number;
  minimumFeeRevenueCents: number;
  balanceFeeRevenueCents: number;
  gamesBlocked: number;
}

export async function getPlatformStats(): Promise<PlatformStats> {
  const env = await getEnv();

  const [users, games, active, blocked, revenue] = await Promise.all([
    env.DB.prepare("SELECT COUNT(*) as count FROM users").first<{ count: number }>(),
    env.DB.prepare("SELECT COUNT(*) as count FROM games").first<{ count: number }>(),
    env.DB.prepare(
      "SELECT COUNT(*) as count FROM games WHERE status IN ('open', 'in_progress')",
    ).first<{ count: number }>(),
    env.DB.prepare("SELECT COUNT(*) as count FROM games WHERE status = 'blocked'").first<{
      count: number;
    }>(),
    env.DB.prepare(
      `SELECT
        COALESCE(SUM(CASE WHEN minimum_fee_status = 'paid' THEN minimum_fee_cents ELSE 0 END), 0) as minimum_revenue,
        COALESCE(SUM(CASE WHEN balance_status = 'paid' THEN balance_cents ELSE 0 END), 0) as balance_revenue
       FROM admin_fee_charges`,
    ).first<{ minimum_revenue: number; balance_revenue: number }>(),
  ]);

  return {
    totalUsers: users?.count ?? 0,
    totalGames: games?.count ?? 0,
    activeGames: active?.count ?? 0,
    gamesBlocked: blocked?.count ?? 0,
    minimumFeeRevenueCents: revenue?.minimum_revenue ?? 0,
    balanceFeeRevenueCents: revenue?.balance_revenue ?? 0,
  };
}

export interface PlatformUserRow {
  id: string;
  name: string;
  email: string;
  role: "player" | "platform_owner";
  created_at: string;
}

export async function listUsers(limit = 100): Promise<PlatformUserRow[]> {
  const env = await getEnv();
  const { results } = await env.DB.prepare(
    "SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC LIMIT ?",
  )
    .bind(limit)
    .all<PlatformUserRow>();
  return results;
}
