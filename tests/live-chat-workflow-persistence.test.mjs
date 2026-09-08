import test from 'node:test';
import assert from 'node:assert/strict';
import { setPrismaClient, persistChatMessage, updatePersistedChatAssignment, getPersistedChatAssignment } from '../artifacts/api-server/src/lib/db-persist.ts';

test('live-chat assignment and delivery state use durable persistence', async () => {
  const calls = [];
  const conversation = { status: 'open', assigned_to: null, claimed_at: null };
  const prisma = {
    conversations: {
      upsert: async (input) => { calls.push(['conversation.upsert', input]); return conversation; },
      update: async ({ data }) => { Object.assign(conversation, data); calls.push(['conversation.update', data]); return conversation; },
      findUnique: async () => ({ ...conversation }),
    },
    chat_messages: {
      create: async (input) => { calls.push(['message.create', input]); return input.data; },
    },
  };
  const conversationId = '11111111-1111-4111-8111-111111111111';
  const agentId = '22222222-2222-4222-8222-222222222222';
  setPrismaClient(prisma);
  try {
    assert.equal(await persistChatMessage(conversationId, 'user', conversationId, 'Please connect me to support.'), true);
    assert.equal(calls.at(-1)[0], 'message.create');
    assert.equal(calls.at(-1)[1].data.delivery_status, 'delivered');
    assert.equal(await updatePersistedChatAssignment(conversationId, agentId), true);
    const restored = await getPersistedChatAssignment(conversationId);
    assert.deepEqual(restored?.status, 'claimed');
    assert.equal(restored?.assignedTo, agentId);
  } finally {
    setPrismaClient(null);
  }
});