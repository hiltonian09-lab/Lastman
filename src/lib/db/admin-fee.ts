import { getEnv } from "@/lib/cloudflare";

export interface AdminFeeConfig {
  minimum_fee_cents: number;
  per_player_fee_cents: number;
  currency: string;
}

export async function getActiveAdminFeeConfig(env?: Env): Promise<AdminFeeConfig> {
  const e = env ?? (await getEnv());
  const row = await e.DB.prepare(
    `SELECT minimum_fee_cents, per_player_fee_cents, currency
     FROM admin_fee_config ORDER BY effective_from DESC LIMIT 1`,
  ).first<AdminFeeConfig>();
  if (!row) throw new Error("No admin_fee_config row found");
  return row;
}

export interface AdminFeeChargeRow {
  id: string;
  game_id: string;
  owner_id: string;
  stripe_customer_id: string | null;
  stripe_payment_method_id: string | null;
  minimum_fee_cents: number;
  minimum_fee_payment_intent_id: string | null;
  minimum_fee_status: "pending" | "paid" | "failed";
  balance_cents: number | null;
  balance_payment_intent_id: string | null;
  balance_status: "not_due" | "pending" | "paid" | "failed" | "retrying";
  player_count_at_lock: number | null;
}

export async function createPendingAdminFeeCharge(params: {
  gameId: string;
  ownerId: string;
  minimumFeeCents: number;
}): Promise<string> {
  const env = await getEnv();
  const id = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO admin_fee_charges (id, game_id, owner_id, minimum_fee_cents)
     VALUES (?, ?, ?, ?)`,
  )
    .bind(id, params.gameId, params.ownerId, params.minimumFeeCents)
    .run();
  return id;
}

export async function getAdminFeeChargeByGameId(
  gameId: string,
  env?: Env,
): Promise<AdminFeeChargeRow | null> {
  const e = env ?? (await getEnv());
  const row = await e.DB.prepare("SELECT * FROM admin_fee_charges WHERE game_id = ?")
    .bind(gameId)
    .first<AdminFeeChargeRow>();
  return row ?? null;
}

export async function markMinimumFeePaid(params: {
  gameId: string;
  paymentIntentId: string;
  customerId: string;
  paymentMethodId: string | null;
}): Promise<void> {
  const env = await getEnv();
  const charge = await getAdminFeeChargeByGameId(params.gameId, env);
  if (!charge) throw new Error("Admin fee charge not found for game");

  await env.DB.batch([
    env.DB.prepare(
      `UPDATE admin_fee_charges
       SET minimum_fee_status = 'paid', minimum_fee_payment_intent_id = ?,
           stripe_customer_id = ?, stripe_payment_method_id = ?
       WHERE game_id = ? AND minimum_fee_status != 'paid'`,
    ).bind(params.paymentIntentId, params.customerId, params.paymentMethodId, params.gameId),
    env.DB.prepare(
      `UPDATE games SET status = 'open' WHERE id = ? AND status = 'draft'`,
    ).bind(params.gameId),
    env.DB.prepare(
      `INSERT INTO admin_fee_ledger
         (id, game_id, owner_id, kind, amount_cents, status, payment_intent_id, player_count_at_lock)
       VALUES (?, ?, ?, 'minimum', ?, 'paid', ?, NULL)`,
    ).bind(
      crypto.randomUUID(),
      params.gameId,
      charge.owner_id,
      charge.minimum_fee_cents,
      params.paymentIntentId,
    ),
  ]);
}

export async function recordAdminFeeLedger(
  env: Env,
  params: {
    gameId: string;
    ownerId: string;
    kind: "minimum" | "balance";
    amountCents: number;
    status: "paid" | "failed";
    paymentIntentId: string | null;
    playerCountAtLock?: number | null;
  },
): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO admin_fee_ledger
       (id, game_id, owner_id, kind, amount_cents, status, payment_intent_id, player_count_at_lock)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      crypto.randomUUID(),
      params.gameId,
      params.ownerId,
      params.kind,
      params.amountCents,
      params.status,
      params.paymentIntentId ?? null,
      params.playerCountAtLock ?? null,
    )
    .run();
}

export async function getRevenueSummary(
  env?: Env,
): Promise<{ total_cents: number; games_charged: number }> {
  const e = env ?? (await getEnv());
  const row = await e.DB.prepare(
    `SELECT COALESCE(SUM(amount_cents), 0) as total_cents,
            COUNT(DISTINCT game_id) as games_charged
     FROM admin_fee_ledger
     WHERE status = 'paid'`,
  ).first<{ total_cents: number; games_charged: number }>();
  return row ?? { total_cents: 0, games_charged: 0 };
}

/** Cron-only: records the computed balance and its outcome once round 1 locks. */
export async function recordBalanceOutcome(
  params: {
    gameId: string;
    playerCountAtLock: number;
    balanceCents: number;
    status: "paid" | "failed";
    paymentIntentId: string | null;
  },
  env?: Env,
): Promise<void> {
  const e = env ?? (await getEnv());
  await e.DB.prepare(
    `UPDATE admin_fee_charges
     SET player_count_at_lock = ?, balance_cents = ?, balance_status = ?,
         balance_payment_intent_id = ?, balance_charged_at = datetime('now')
     WHERE game_id = ?`,
  )
    .bind(
      params.playerCountAtLock,
      params.balanceCents,
      params.status,
      params.paymentIntentId,
      params.gameId,
    )
    .run();

  const charge = await getAdminFeeChargeByGameId(params.gameId, e);
  if (charge) {
    await recordAdminFeeLedger(e, {
      gameId: params.gameId,
      ownerId: charge.owner_id,
      kind: "balance",
      amountCents: params.balanceCents,
      status: params.status,
      paymentIntentId: params.paymentIntentId,
      playerCountAtLock: params.playerCountAtLock,
    });
  }
}
