-- Immutable ledger of every admin-fee charge (minimum + balance) for
-- reconciliation and revenue reporting.
CREATE TABLE admin_fee_ledger (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('minimum', 'balance')),
  amount_cents INTEGER NOT NULL,
  status TEXT NOT NULL,
  payment_intent_id TEXT,
  player_count_at_lock INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_admin_fee_ledger_game ON admin_fee_ledger(game_id);
CREATE INDEX idx_admin_fee_ledger_owner ON admin_fee_ledger(owner_id);
CREATE INDEX idx_admin_fee_ledger_created ON admin_fee_ledger(created_at);
