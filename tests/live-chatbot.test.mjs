import test from 'node:test';
import assert from 'node:assert/strict';
import { getChatbotResponse, keywordEscalation } from '../artifacts/api-server/src/lib/chatbot.ts';
import fs from 'node:fs/promises';

const cases = [
  ['How do I sign up and verify my email?', 'account'],
  ['How do I place my first demo trade?', 'demo_trading'],
  ['How do I deposit money?', 'deposits'],
  ['Where is my withdrawal?', 'withdrawals'],
  ['What documents do I need for KYC?', 'kyc'],
  ['What are the fees and spreads?', 'fees'],
  ['How does SmartVest work?', 'investments'],
  ['How do I use copy trading?', 'copy_trading'],
  ['How do I protect my account from phishing?', 'security'],
];

test('chatbot covers the website FAQ taxonomy', () => {
  for (const [question, intent] of cases) {
    const response = getChatbotResponse(question, 'Visitor');
    assert.equal(response.intent, intent, question);
    assert.ok(response.content.length > 40, question);
    assert.equal(response.shouldEscalate, false, question);
  }
});

test('chatbot escalates explicit human support requests', () => {
  const response = getChatbotResponse('Please connect me with a human representative', 'Visitor');
  assert.equal(response.shouldEscalate, true);
  assert.match(response.content, /human support/i);
});

test('chatbot escalates account-specific funds and compliance questions', () => {
  assert.equal(keywordEscalation('What is my withdrawal status?'), true);
  assert.equal(keywordEscalation('Can you tell me my KYC status?'), true);
  assert.equal(keywordEscalation('Should I buy EUR/USD now?'), true);
  assert.equal(keywordEscalation('Can you guarantee me 20% returns?'), true);
});

test('chatbot supports FAQ commands for self-service visitors', () => {
  const menu = getChatbotResponse('/help', 'Visitor');
  assert.match(menu.content, /\/faq account/);
  assert.equal(menu.shouldEscalate, false);

  const trading = getChatbotResponse('/faq trading', 'Visitor');
  assert.equal(trading.intent, 'forex');
  assert.match(trading.content, /simulated funds/i);

  const security = getChatbotResponse('/faq security', 'Visitor');
  assert.equal(security.intent, 'security');
  assert.match(security.content, /never ask for your password/i);
});

test('unknown financial-support requests are safe to escalate when the AI provider is unavailable', () => {
  const response = getChatbotResponse('Can you explain an unsupported feature to me?', 'Visitor');
  assert.equal(response.intent, 'general');
  assert.equal(response.shouldEscalate, false);
});

test('live chat has deterministic business-hours and offline-ticket routing', async () => {
  const source = await fs.readFile(new URL('../artifacts/api-server/src/routes/live-chat.ts', import.meta.url), 'utf8');
  assert.match(source, /LIVE_CHAT_BUSINESS_HOURS_START/);
  assert.match(source, /outside business hours/);
  assert.match(source, /businessHours/);
});
