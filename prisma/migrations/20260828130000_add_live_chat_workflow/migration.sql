ALTER TABLE "conversations"
  ADD COLUMN "assigned_to" UUID,
  ADD COLUMN "claimed_at" TIMESTAMP(6),
  ADD COLUMN "last_message_at" TIMESTAMP(6);

ALTER TABLE "chat_messages"
  ADD COLUMN "delivery_status" TEXT NOT NULL DEFAULT 'delivered';

CREATE INDEX "conversations_status_assigned_to_idx"
  ON "conversations"("status", "assigned_to");

CREATE INDEX "chat_messages_conversation_id_created_at_idx"
  ON "chat_messages"("conversation_id", "created_at");