-- Add signup_payload column to otp_codes table
ALTER TABLE "otp_codes"
  ADD COLUMN IF NOT EXISTS "signup_payload" JSONB;
