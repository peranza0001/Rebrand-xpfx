-- Add is_demo to transactions
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false;
