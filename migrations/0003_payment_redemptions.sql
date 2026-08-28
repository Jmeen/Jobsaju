CREATE TABLE IF NOT EXISTS payment_redemptions (
  payment_id TEXT PRIMARY KEY,
  unlock_token TEXT NOT NULL,
  redeemed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
