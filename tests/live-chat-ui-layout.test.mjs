import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const widgetSource = await readFile(new URL('../artifacts/nextrade/src/components/live-chat-widget.tsx', import.meta.url), 'utf8');

test('live chat widget keeps the full panel visible with safe-area-aware controls', () => {
  assert.match(widgetSource, /safe-area-inset-bottom/i, 'Widget must include safe-area bottom padding for mobile devices.');
  assert.match(widgetSource, /max-h-\[calc\(100vh-5rem\)\]|h-\[min\(82vh,36rem\)\]/i, 'Widget must use a viewport-based height that prevents the panel from being cut off.');
  assert.match(widgetSource, /pointer-events-auto/i, 'Widget must keep the full panel interactive and clickable.');
});

test('live chat widget skips the guest profile form for authenticated users', () => {
  assert.match(widgetSource, /sessionData\.user\.id/i, 'Authenticated users must be detected from the session before the guest form runs.');
  assert.match(widgetSource, /setVisitorProfile\(profile\.name \|\| profile\.email \? profile : null\)/i, 'Signed-in users should populate visitorProfile directly from their session.');
  assert.match(widgetSource, /removeItem\("xpfx_live_chat_profile"\)/i, 'Any stale guest profile must be cleared when a user is already signed in.');
});
