-- AddColumn is_demo to transactions and user_sessions tables
-- These columns were defined in schema.prisma but never migrated to the database

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false;
