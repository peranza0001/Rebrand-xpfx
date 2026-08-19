#!/usr/bin/env node
/**
 * Deployment Diagnostic Script
 * Checks the health and configuration of all deployment targets
 */

import http from 'http';
import https from 'https';
import { URL } from 'url';

const endpoints = [
  {
    name: 'Railway URL',
    url: process.env.RAILWAY_URL || 'https://rebrand-xpfx-production.up.railway.app',
  },
  {
    name: 'Custom Domain',
    url: 'https://xpressprofx.com',
  },
  {
    name: 'Custom Domain (www)',
    url: 'https://www.xpressprofx.com',
  },
  {
    name: 'VPS Localhost',
    url: 'http://127.0.0.1:3000',
  },
];

async function checkEndpoint(endpoint) {
  return new Promise((resolve) => {
    const urlObj = new URL(endpoint.url);
    const protocol = urlObj.protocol === 'https:' ? https : http;

    const request = protocol.get(endpoint.url, { timeout: 5000 }, (response) => {
      let data = '';

      response.on('data', (chunk) => {
        data += chunk;
      });

      response.on('end', () => {
        const isSpa = data.includes('<html') || data.includes('<!DOCTYPE');
        const isJson = data.startsWith('{');
        const is404 = response.statusCode === 404;
        const is500 = response.statusCode === 500;

        resolve({
          name: endpoint.name,
          url: endpoint.url,
          status: response.statusCode,
          statusMessage: response.statusMessage,
          headers: response.headers,
          isSpa,
          isJson,
          is404,
          is500,
          error: null,
          dataPreview: data.substring(0, 200),
        });
      });
    });

    request.on('error', (error) => {
      resolve({
        name: endpoint.name,
        url: endpoint.url,
        status: null,
        statusMessage: null,
        headers: null,
        isSpa: false,
        isJson: false,
        is404: false,
        is500: false,
        error: error.message,
        dataPreview: null,
      });
    });

    request.on('timeout', () => {
      request.destroy();
      resolve({
        name: endpoint.name,
        url: endpoint.url,
        status: null,
        statusMessage: null,
        headers: null,
        isSpa: false,
        isJson: false,
        is404: false,
        is500: false,
        error: 'Timeout (no response)',
        dataPreview: null,
      });
    });
  });
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  XpressPro FX — Deployment Health Check                       ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log('');

  const results = [];
  for (const endpoint of endpoints) {
    console.log(`🔍 Checking ${endpoint.name}...`);
    const result = await checkEndpoint(endpoint);
    results.push(result);
  }

  console.log('');
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  RESULTS                                                       ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log('');

  for (const result of results) {
    const status = result.status ? `${result.status} ${result.statusMessage}` : 'NO RESPONSE';
    const icon = result.error ? '❌' : result.is500 ? '⚠️' : result.is404 ? '❌' : '✅';
    
    console.log(`${icon} ${result.name}`);
    console.log(`   URL: ${result.url}`);
    console.log(`   Status: ${status}`);
    
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    } else {
      if (result.isSpa) {
        console.log(`   ✓ Serving SPA (HTML)`);
      }
      if (result.isJson) {
        console.log(`   ✓ Serving JSON (API)`);
      }
      if (result.is404) {
        console.log(`   ✗ 404: Frontend build not found`);
      }
      if (result.is500) {
        console.log(`   ✗ 500: Internal server error`);
      }
    }
    console.log('');
  }

  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  INTERPRETATION                                               ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log('');

  const railwayResult = results.find(r => r.name === 'Railway URL');
  const customDomainResult = results.find(r => r.name === 'Custom Domain');

  if (railwayResult?.error) {
    console.log('⚠️  Railway URL not responding');
    console.log('   → Check Railway service status and network connectivity');
  } else if (railwayResult?.is404) {
    console.log('⚠️  Railway: Frontend build not found');
    console.log('   → Run: npm run build');
    console.log('   → Redeploy to Railway');
  } else if (railwayResult?.is500) {
    console.log('⚠️  Railway: 500 Internal Server Error');
    console.log('   → Check Railway logs for error details');
  } else if (railwayResult?.isSpa) {
    console.log('✅ Railway: Frontend is being served correctly');
  }

  console.log('');

  if (customDomainResult?.error) {
    console.log('⚠️  Custom Domain not responding');
    console.log('   → Check DNS resolution: nslookup xpressprofx.com');
    console.log('   → Check domain provider settings');
    console.log('   → Ensure domain is configured on deployment platform');
  } else if (customDomainResult?.is404) {
    console.log('⚠️  Custom Domain: Frontend build not found');
    console.log('   → If on VPS: SSH to VPS and run npm run build');
    console.log('   → If on Railway: Add custom domain in Railway dashboard');
    console.log('   → Redeploy the application');
  } else if (customDomainResult?.is500) {
    console.log('⚠️  Custom Domain: 500 Internal Server Error');
    console.log('   → Check deployment platform logs');
  } else if (customDomainResult?.isSpa) {
    console.log('✅ Custom Domain: Frontend is being served correctly');
  }

  console.log('');
}

main().catch(console.error);
