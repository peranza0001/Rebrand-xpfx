-- Add password reset token columns to users table
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "email_verify_token" TEXT,
  ADD COLUMN IF NOT EXISTS "reset_password_token" TEXT,
  ADD COLUMN IF NOT EXISTS "reset_password_expiry" TIMESTAMP(6);
