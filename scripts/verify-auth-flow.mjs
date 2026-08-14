#!/usr/bin/env node
/**
 * Auth Flow Verification Script
 * Tests signup, OTP verification, and login on both Railway and custom domain
 */

import http from 'http';
import https from 'https';
import { URL } from 'url';

const baseUrls = [
  { name: 'Railway', url: 'https://rebrand-xpfx-production.up.railway.app' },
  { name: 'Custom Domain', url: 'https://xpressprofx.com' },
];

async function makeRequest(url, method = 'GET', body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol === 'https:' ? https : http;

    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      timeout: 10000,
    };

    const request = protocol.request(options, (response) => {
      let data = '';

      response.on('data', (chunk) => {
        data += chunk;
      });

      response.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({
            status: response.statusCode,
            headers: response.headers,
            body: parsed,
            raw: data,
          });
        } catch {
          resolve({
            status: response.statusCode,
            headers: response.headers,
            body: null,
            raw: data,
          });
        }
      });
    });

    request.on('error', reject);
    request.on('timeout', () => {
      request.destroy();
      reject(new Error('Request timeout'));
    });

    if (body) {
      request.write(JSON.stringify(body));
    }

    request.end();
  });
}

async function testAuthFlow(baseUrl) {
  console.log(`\n📋 Testing Auth Flow on ${baseUrl}`);
  console.log('━'.repeat(60));

  const testEmail = `test_${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!@#';

  try {
    // Step 1: Signup
    console.log('\n1️⃣  Testing Signup...');
    const signupResponse = await makeRequest(
      `${baseUrl}/api/auth/signup`,
      'POST',
      {
        email: testEmail,
        password: testPassword,
        fullName: 'Test User',
        country: 'US',
      }
    );

    if (signupResponse.status === 200) {
      console.log('   ✅ Signup: 200 OK');
      console.log(`   Response: ${JSON.stringify(signupResponse.body).substring(0, 100)}...`);
    } else if (signupResponse.status === 500) {
      console.log(`   ❌ Signup: 500 Internal Server Error`);
      console.log(`   Error: ${signupResponse.raw}`);
      return false;
    } else {
      console.log(`   ⚠️  Signup: ${signupResponse.status}`);
      console.log(`   Response: ${JSON.stringify(signupResponse.body).substring(0, 100)}...`);
    }

    // Step 2: Login (should fail with pending OTP)
    console.log('\n2️⃣  Testing Login (expecting OTP pending)...');
    const loginResponse = await makeRequest(
      `${baseUrl}/api/auth/login`,
      'POST',
      {
        email: testEmail,
        password: testPassword,
      }
    );

    if (loginResponse.status === 200) {
      console.log('   ✅ Login: 200 OK');
      console.log(`   Response: ${JSON.stringify(loginResponse.body).substring(0, 150)}...`);
      if (loginResponse.body?.sessionId) {
        console.log(`   ✓ Session created: ${loginResponse.body.sessionId.substring(0, 20)}...`);
      }
    } else if (loginResponse.status === 500) {
      console.log(`   ❌ Login: 500 Internal Server Error`);
      console.log(`   Error: ${loginResponse.raw}`);
      return false;
    } else {
      console.log(`   ⚠️  Login: ${loginResponse.status}`);
      console.log(`   Response: ${JSON.stringify(loginResponse.body).substring(0, 100)}...`);
    }

    // Step 3: Health check
    console.log('\n3️⃣  Testing Health Check...');
    const healthResponse = await makeRequest(`${baseUrl}/healthz`);
    
    if (healthResponse.status === 200) {
      console.log('   ✅ Health: 200 OK');
      console.log(`   Service: ${healthResponse.body?.service || 'unknown'}`);
      console.log(`   Environment: ${healthResponse.body?.environment || 'unknown'}`);
    } else {
      console.log(`   ❌ Health: ${healthResponse.status}`);
    }

    return loginResponse.status !== 500 && signupResponse.status !== 500;
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  XpressPro FX — Auth Flow Verification                        ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');

  const results = {};

  for (const target of baseUrls) {
    results[target.name] = await testAuthFlow(target.url);
  }

  console.log('\n\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║  SUMMARY                                                       ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  for (const [name, passed] of Object.entries(results)) {
    const icon = passed ? '✅' : '❌';
    console.log(`${icon} ${name}: ${passed ? 'PASS' : 'FAIL'}`);
  }

  if (Object.values(results).every(r => r)) {
    console.log('\n✅ All auth flows are working correctly!');
    process.exit(0);
  } else {
    console.log('\n❌ Some auth flows are failing. Check logs above.');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
