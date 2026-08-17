-- Add email column to otp_codes table
ALTER TABLE "otp_codes"
  ADD COLUMN IF NOT EXISTS "email" TEXT NOT NULL DEFAULT '';
