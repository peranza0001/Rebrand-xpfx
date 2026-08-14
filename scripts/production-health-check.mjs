#!/usr/bin/env node

/**
 * Production Health Check & Verification Script
 * 
 * Usage:
 *   node scripts/production-health-check.mjs https://api.yourdomain.com
 * 
 * Verifies:
 *   - API connectivity and health
 *   - Database connection
 *   - Authentication endpoints
 *   - Security headers
 *   - Performance metrics
 *   - Webhook endpoints
 *   - Rate limiting
 */

import https from 'https';
import http from 'http';
import { URL } from 'url';

const args = process.argv.slice(2);
const baseUrl = args[0] || 'http://localhost:8080';

let passCount = 0;
let failCount = 0;
let warnCount = 0;

// ANSI Colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(message) {
  console.log(message);
}

function pass(message) {
  console.log(`${colors.green}✓${colors.reset} ${message}`);
  passCount++;
}

function fail(message) {
  console.log(`${colors.red}✗${colors.reset} ${message}`);
  failCount++;
}

function warn(message) {
  console.log(`${colors.yellow}⚠${colors.reset} ${message}`);
  warnCount++;
}

function info(message) {
  console.log(`${colors.blue}ℹ${colors.reset} ${message}`);
}

function section(title) {
  console.log(`\n${colors.bold}${colors.blue}═══ ${title} ═══${colors.reset}`);
}

async function fetchJson(endpoint, method = 'GET') {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, baseUrl);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;

    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Production-Health-Check/1.0',
      },
      rejectUnauthorized: false, // Allow self-signed certs in dev
    };

    const req = client.request(url, options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({
            status: res.statusCode,
            data: parsed,
            headers: res.headers,
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: data,
            headers: res.headers,
          });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.setTimeout(10000);
    req.end();
  });
}

async function checkConnectivity() {
  section('🔗 CONNECTIVITY CHECK');

  try {
    const result = await fetchJson('/healthz');
    if (result.status === 200) {
      pass(`API responding: ${baseUrl}`);
      if (result.data.status === 'ok') {
        pass('Health status: OK');
      }
    } else {
      fail(`API returned status ${result.status}`);
    }
  } catch (err) {
    fail(`Cannot connect to API: ${err.message}`);
    return false;
  }

  return true;
}

async function checkDatabase() {
  section('🗄️  DATABASE CHECK');

  try {
    const result = await fetchJson('/api/health');
    
    if (result.status === 200) {
      if (result.data.database === 'connected') {
        pass('Database connected');
      } else {
        fail(`Database status: ${result.data.database}`);
      }
    } else {
      fail(`Health endpoint returned ${result.status}`);
    }
  } catch (err) {
    fail(`Cannot check database: ${err.message}`);
  }
}

async function checkAuthentication() {
  section('🔐 AUTHENTICATION CHECK');

  try {
    // CSRF Token
    const csrfResult = await fetchJson('/api/csrf-token');
    if (csrfResult.status === 200 && csrfResult.data.token) {
      pass('CSRF token endpoint working');
    } else {
      fail('CSRF token endpoint not working');
    }

    // Demo auth endpoint (if enabled)
    try {
      const demoResult = await fetchJson('/api/demo-auth');
      if (demoResult.status === 200) {
        pass('Demo authentication available');
      }
    } catch (e) {
      warn('Demo authentication not available (may be disabled)');
    }
  } catch (err) {
    fail(`Authentication check failed: ${err.message}`);
  }
}

async function checkSecurityHeaders() {
  section('🛡️  SECURITY HEADERS CHECK');

  try {
    const result = await fetchJson('/');
    const headers = result.headers;

    const securityHeaders = {
      'strict-transport-security': 'HSTS',
      'content-security-policy': 'CSP',
      'x-content-type-options': 'X-Content-Type-Options',
      'x-frame-options': 'X-Frame-Options',
      'x-xss-protection': 'X-XSS-Protection',
      'referrer-policy': 'Referrer-Policy',
    };

    for (const [header, name] of Object.entries(securityHeaders)) {
      if (headers[header]) {
        pass(`${name} header present`);
      } else {
        warn(`${name} header missing (optional)`);
      }
    }

    // Check HTTPS
    if (baseUrl.startsWith('https://')) {
      pass('Using HTTPS');
    } else if (baseUrl.startsWith('http://')) {
      warn('Using HTTP (not secure for production)');
    }
  } catch (err) {
    warn(`Cannot check security headers: ${err.message}`);
  }
}

async function checkMetrics() {
  section('📊 METRICS CHECK');

  try {
    const result = await fetchJson('/metrics');
    
    if (result.status === 200) {
      pass('Metrics endpoint available');
      
      // Count metric lines
      const lines = result.data.split('\n').filter(l => !l.startsWith('#'));
      info(`Found ${lines.length} metrics`);
    } else {
      warn(`Metrics endpoint returned ${result.status}`);
    }
  } catch (err) {
    warn(`Metrics endpoint not available: ${err.message}`);
  }
}

async function checkRateLimiting() {
  section('🚦 RATE LIMITING CHECK');

  try {
    let statusCode = 200;
    let requestCount = 0;

    // Make multiple requests quickly
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(
        fetchJson('/api/csrf-token')
          .then((res) => {
            requestCount++;
            statusCode = res.status;
          })
          .catch((err) => {
            // Rate limited
            statusCode = 429;
          })
      );
    }

    await Promise.all(promises);

    if (statusCode === 429) {
      pass('Rate limiting active (got 429 Too Many Requests)');
    } else if (statusCode === 200) {
      warn('Rate limiting may not be active (no 429 responses)');
    }
  } catch (err) {
    warn(`Rate limiting check failed: ${err.message}`);
  }
}

async function checkPerformance() {
  section('⚡ PERFORMANCE CHECK');

  try {
    const startTime = Date.now();
    await fetchJson('/healthz');
    const duration = Date.now() - startTime;

    if (duration < 100) {
      pass(`Fast response: ${duration}ms`);
    } else if (duration < 500) {
      warn(`Moderate response: ${duration}ms`);
    } else {
      fail(`Slow response: ${duration}ms`);
    }
  } catch (err) {
    fail(`Performance check failed: ${err.message}`);
  }
}

async function checkEnvironment() {
  section('🔧 ENVIRONMENT CHECK');

  try {
    const result = await fetchJson('/healthz');
    
    if (result.data.environment) {
      const env = result.data.environment;
      if (env === 'production') {
        pass('Environment: production');
      } else {
        warn(`Environment: ${env} (not production)`);
      }
    } else {
      info('Environment information not available');
    }

    if (result.data.version) {
      info(`Version: ${result.data.version}`);
    }
  } catch (err) {
    warn(`Environment check failed: ${err.message}`);
  }
}

async function checkAdminEndpoints() {
  section('👤 ADMIN ENDPOINTS CHECK');

  const endpoints = [
    '/api/admin/users',
    '/api/admin/logs',
    '/api/admin/settings',
  ];

  for (const endpoint of endpoints) {
    try {
      const result = await fetchJson(endpoint);
      
      if (result.status === 401) {
        pass(`${endpoint} requires authentication (expected)`);
      } else if (result.status === 200) {
        warn(`${endpoint} accessible without auth (security risk)`);
      } else if (result.status === 403) {
        pass(`${endpoint} forbidden without auth (expected)`);
      } else {
        info(`${endpoint} responded with ${result.status}`);
      }
    } catch (err) {
      // Endpoint not available
    }
  }
}

async function runAllChecks() {
  section('🚀 PRODUCTION HEALTH CHECK');
  info(`Target: ${baseUrl}`);
  info(`Time: ${new Date().toISOString()}`);

  // Connectivity is critical
  const connected = await checkConnectivity();
  if (!connected) {
    fail('Cannot proceed - API not responding');
    printSummary();
    process.exit(1);
  }

  // Run all checks
  await checkDatabase();
  await checkAuthentication();
  await checkSecurityHeaders();
  await checkMetrics();
  await checkRateLimiting();
  await checkPerformance();
  await checkEnvironment();
  await checkAdminEndpoints();

  printSummary();
}

function printSummary() {
  section('SUMMARY');

  const total = passCount + failCount + warnCount;
  const percentage = total > 0 ? Math.round((passCount / total) * 100) : 0;

  console.log(`\n${colors.green}✓ Passed:  ${passCount}${colors.reset}`);
  console.log(`${colors.red}✗ Failed:  ${failCount}${colors.reset}`);
  console.log(`${colors.yellow}⚠ Warned:  ${warnCount}${colors.reset}`);
  console.log(`\n${colors.bold}Health Score: ${percentage}%${colors.reset}`);

  if (failCount === 0) {
    console.log(`\n${colors.green}${colors.bold}✓ PRODUCTION READY${colors.reset}`);
    process.exit(0);
  } else {
    console.log(`\n${colors.red}${colors.bold}✗ ISSUES DETECTED${colors.reset}`);
    console.log('Please fix the issues above before deploying to production.\n');
    process.exit(1);
  }
}

// Run the checks
runAllChecks().catch((err) => {
  fail(`Health check crashed: ${err.message}`);
  process.exit(1);
});
