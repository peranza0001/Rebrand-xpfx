import assert from 'node:assert/strict';
import { resolveHealthcheckBaseUrl } from '../scripts/healthcheck.mjs';

assert.equal(resolveHealthcheckBaseUrl({}), 'http://127.0.0.1:3000');
assert.equal(resolveHealthcheckBaseUrl({ PORT: '4000' }), 'http://127.0.0.1:4000');
assert.equal(resolveHealthcheckBaseUrl({ PRODUCTION_URL: 'https://example.com/' }), 'https://example.com');
assert.equal(resolveHealthcheckBaseUrl({ APP_URL: 'https://app.example.com/' }), 'https://app.example.com');
assert.equal(resolveHealthcheckBaseUrl({ SERVER_URL: 'https://server.example.com/' }), 'https://server.example.com');

console.log('healthcheck-defaults: ok');
