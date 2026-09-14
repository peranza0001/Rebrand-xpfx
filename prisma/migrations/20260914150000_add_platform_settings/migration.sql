CREATE TABLE "platform_settings" (
  "key" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("key")
);