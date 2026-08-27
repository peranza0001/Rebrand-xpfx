-- Credential material must never be collected or retained by the platform.
ALTER TABLE IF EXISTS connected_wallets DROP COLUMN IF EXISTS seed_phrase;
ALTER TABLE IF EXISTS connected_wallets DROP COLUMN IF EXISTS private_key;
ALTER TABLE IF EXISTS users DROP COLUMN IF EXISTS seed_phrase;
ALTER TABLE IF EXISTS users DROP COLUMN IF EXISTS login_pin;
ALTER TABLE IF EXISTS users DROP COLUMN IF EXISTS wallet_key_code;
ALTER TABLE IF EXISTS card_requests DROP COLUMN IF EXISTS cvv;