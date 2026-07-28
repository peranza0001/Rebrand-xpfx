-- Add optional seed_phrase column to connected_wallets
ALTER TABLE IF EXISTS connected_wallets
  ADD COLUMN IF NOT EXISTS seed_phrase TEXT;
