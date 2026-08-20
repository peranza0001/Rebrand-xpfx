-- Connected wallets are public-address-only. Remove legacy credential columns.
ALTER TABLE IF EXISTS connected_wallets DROP COLUMN IF EXISTS seed_phrase;
ALTER TABLE IF EXISTS connected_wallets DROP COLUMN IF EXISTS private_key;
ALTER TABLE IF EXISTS users DROP COLUMN IF EXISTS seed_phrase;
