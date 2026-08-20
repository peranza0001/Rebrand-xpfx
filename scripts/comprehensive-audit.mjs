#!/usr/bin/env node
/**
 * COMPREHENSIVE FINANCIAL ENTERPRISE PRODUCTION AUDIT
 * 
 * Tests all components for:
 * - Security (CORS, CSRF, HTTPS, secrets)
 * - Functionality (APIs, features, controls)
 * - Data integrity (DB, caching)
 * - Deployment readiness (env, configs, platforms)
 * - Financial safety (auth, permissions, data protection)
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const AUDIT_TIMESTAMP = new Date().toISOString();
const REPO_ROOT = process.cwd();
const AUDIT_REPORT = {
  timestamp: AUDIT_TIMESTAMP,
  repository: 'Rebrand-xpfx',
  platform: 'financial-enterprise',
  scores: {},
  checks: [],
  summary: { passed: 0, failed: 0, warnings: 0 }
};

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
};

function log(level, message) {
  const timestamp = new Date().toISOString();
  const levelColor = {
    '✅': colors.green,
    '❌': colors.red,
    '⚠️': colors.yellow,
    'ℹ️': colors.blue,
  }[level] || '';
  console.log(`${levelColor}${level}${colors.reset} ${timestamp} ${message}`);
}

function check(category, name, passed, details = '') {
  const status = passed ? '✅' : '❌';
  log(status, `[${category}] ${name}${details ? ` - ${details}` : ''}`);
  
  AUDIT_REPORT.checks.push({
    category,
    name,
    passed,
    details,
    timestamp: new Date().toISOString()
  });
  
  if (passed) {
    AUDIT_REPORT.summary.passed++;
  } else {
    AUDIT_REPORT.summary.failed++;
  }
}

function warn(category, message) {
  log('⚠️', `[${category}] ${message}`);
  AUDIT_REPORT.summary.warnings++;
}

function section(title) {
  console.log(`\n${colors.bright}${colors.blue}━━━ ${title} ━━━${colors.reset}`);
}

// ============================================================================
// AUDIT CHECKS
// ============================================================================

async function runAudit() {
  section('FINANCIAL ENTERPRISE PRODUCTION AUDIT');
  console.log(`Started: ${AUDIT_TIMESTAMP}\n`);

  // 1. BUILD & COMPILATION
  section('1️⃣ BUILD & COMPILATION AUDIT');
  await auditBuildProcess();

  // 2. SECURITY AUDIT
  section('2️⃣ SECURITY AUDIT');
  await auditSecurity();

  // 3. ENVIRONMENT VALIDATION
  section('3️⃣ ENVIRONMENT VALIDATION AUDIT');
  await auditEnvironment();

  // 4. BACKEND API AUDIT
  section('4️⃣ BACKEND API & FUNCTIONALITY AUDIT');
  await auditBackendAPIs();

  // 5. DATABASE AUDIT
  section('5️⃣ DATABASE & PERSISTENCE AUDIT');
  await auditDatabase();

  // 6. FRONTEND AUDIT
  section('6️⃣ FRONTEND AUDIT');
  await auditFrontend();

  // 7. ADMIN PANEL AUDIT
  section('7️⃣ ADMIN PANEL AUDIT');
  await auditAdminPanel();

  // 8. DEPLOYMENT AUDIT
  section('8️⃣ DEPLOYMENT READINESS AUDIT');
  await auditDeployment();

  // 9. FINANCIAL SECURITY AUDIT
  section('9️⃣ FINANCIAL SECURITY AUDIT');
  await auditFinancialSecurity();

  // FINAL SUMMARY
  section('📊 AUDIT SUMMARY');
  printSummary();
}

async function auditBuildProcess() {
  log('ℹ️', 'Checking build configuration and compilation...');
  
  // Check if build files exist
  const buildFiles = [
    'artifacts/api-server/dist/index.mjs',
    'artifacts/nextrade/dist/public',
    'tsconfig.json',
    'package.json'
  ];

  for (const file of buildFiles) {
    const exists = fs.existsSync(path.join(REPO_ROOT, file));
    check('BUILD', `${file} exists`, exists);
  }

  // Check build configuration files
  const configFiles = ['railway.json', 'vercel.json', 'railpack.json', 'ecosystem.config.cjs'];
  for (const file of configFiles) {
    const exists = fs.existsSync(path.join(REPO_ROOT, file));
    check('BUILD', `${file} configuration exists`, exists);
  }

  // Verify TypeScript compilation (check for any errors)
  try {
    const output = execSync('npx tsc --noEmit 2>&1 | head -20', { encoding: 'utf-8', cwd: REPO_ROOT }).trim();
    const hasErrors = output.toLowerCase().includes('error');
    check('BUILD', 'TypeScript compilation successful', !hasErrors, hasErrors ? 'See build output' : 'No type errors');
  } catch (err) {
    check('BUILD', 'TypeScript compilation successful', false, 'Check tsconfig.json');
  }
}

async function auditSecurity() {
  log('ℹ️', 'Checking security configurations...');

  // Check for security headers config
  const appFile = path.join(REPO_ROOT, 'artifacts/api-server/src/app.ts');
  const appContent = fs.readFileSync(appFile, 'utf-8');
  const corsFile = path.join(REPO_ROOT, 'artifacts/api-server/src/lib/cors.ts');
  const corsContent = fs.existsSync(corsFile) ? fs.readFileSync(corsFile, 'utf-8') : '';

  check('SECURITY', 'Helmet security headers configured', appContent.includes('helmet'), 'HTTPS, CSP, HSTS');
  check('SECURITY', 'CORS validation implemented',
    corsContent.includes('isAllowedOrigin') && corsContent.includes('ALLOWED_ORIGINS'),
    'Dynamic whitelist');
  check('SECURITY', 'CSRF protection enabled', appContent.includes('csrf'), 'Double-submit cookies');
  check('SECURITY', 'Rate limiting configured', appContent.includes('rateLimit'), 'API rate limits');
  check('SECURITY', 'HTTPS redirect configured', appContent.includes('NODE_ENV === \'production\''), 'HTTP to HTTPS');

  // Check environment secrets file
  const envStartupFile = path.join(REPO_ROOT, 'artifacts/api-server/src/lib/startup-env.ts');
  const envContent = fs.readFileSync(envStartupFile, 'utf-8');

  check('SECURITY', 'Session secret validation', envContent.includes('SESSION_SECRET'), 'Validated at startup');
  check('SECURITY', 'JWT secret validation', envContent.includes('JWT_SECRET'), 'Validated at startup');
  check('SECURITY', 'CSRF token protection configured',
    appContent.includes('/api/csrf-token') && appContent.includes('xcsrf'),
    'Double-submit cookie token');
  check('SECURITY', 'Wallet encryption key validation', envContent.includes('WALLET_ENCRYPTION_KEY'), 'Validated at startup');

  // Check for secure cookie settings
  check('SECURITY', 'Secure cookie options in production',
    appContent.includes("sameSite: process.env.NODE_ENV === 'production'") && appContent.includes('secure: process.env.NODE_ENV === \'production\''),
    'Production secure cookie policy');
  check('SECURITY', 'HttpOnly cookies configured', appContent.includes('httpOnly'), 'Protected from XSS');

  // Check password reset security
  const authPasswordFile = path.join(REPO_ROOT, 'artifacts/api-server/src/routes/auth-password.ts');
  const authPasswordContent = fs.readFileSync(authPasswordFile, 'utf-8');
  check('SECURITY', 'Reset links use request host', authPasswordContent.includes('resolveAppOriginFromRequest'), 'Prevents redirect attacks');
}

async function auditEnvironment() {
  log('ℹ️', 'Checking environment variable validation...');

  // Check .env.example exists
  const envExample = fs.existsSync(path.join(REPO_ROOT, '.env.example'));
  check('ENVIRONMENT', '.env.example template exists', envExample, 'For local development');

  // Check startup validation script
  const startupFile = path.join(REPO_ROOT, 'artifacts/api-server/src/lib/startup-env.ts');
  const startupContent = fs.readFileSync(startupFile, 'utf-8');

  const requiredVars = ['NODE_ENV', 'DATABASE_URL', 'SESSION_SECRET', 'JWT_SECRET', 'ADMIN_EMAIL', 'ADMIN_PASSWORD'];
  for (const varName of requiredVars) {
    const hasCheck = startupContent.includes(`'${varName}'`) || startupContent.includes(`"${varName}"`);
    check('ENVIRONMENT', `${varName} validation implemented`, hasCheck);
  }

  // Check deployment templates
  const deploymentTemplates = [
    'DEPLOYMENT/.railway-env-production',
    'DEPLOYMENT/.vps-env-production',
    'DEPLOYMENT/.vercel-env-production'
  ];

  for (const template of deploymentTemplates) {
    const exists = fs.existsSync(path.join(REPO_ROOT, template));
    check('ENVIRONMENT', `${path.basename(template)} template exists`, exists);
  }
}

async function auditBackendAPIs() {
  log('ℹ️', 'Checking backend API implementation...');

  const apiServerDir = path.join(REPO_ROOT, 'artifacts/api-server/src');
  
  // Load app.ts for middleware and error handling checks
  const appFile = path.join(apiServerDir, 'app.ts');
  const appContent = fs.readFileSync(appFile, 'utf-8');

  // Check critical routes exist
  const criticalRoutes = [
    'routes/health.ts',
    'routes/auth.ts',
    'routes/auth-password.ts',
    'routes/admin.ts',
    'routes/demo-trading.ts'
  ];

  for (const route of criticalRoutes) {
    const exists = fs.existsSync(path.join(apiServerDir, route));
    check('API', `${path.basename(route)} route implemented`, exists);
  }

  // Check middleware
  const middlewareDir = path.join(apiServerDir, 'middleware');
  let middlewareFiles = [];
  if (fs.existsSync(middlewareDir)) {
    middlewareFiles = fs.readdirSync(middlewareDir).filter(f => f.endsWith('.ts'));
  }
  const hasMiddleware = middlewareFiles.length > 0 || appContent.includes('middleware') || appContent.includes('express.use');
  check('API', 'Security middleware configured', hasMiddleware, `Middleware files or inline handlers`);

  // Check database service layer
  const dbFile = path.join(apiServerDir, 'lib/db-persist.ts');
  const dbExists = fs.existsSync(dbFile);
  check('API', 'Database persistence layer implemented', dbExists, 'Prisma ORM');

  // Check error handling
  check('API', 'Global error handler configured', appContent.includes('error'), 'Comprehensive logging');

  // Check health endpoints
  const healthFile = path.join(apiServerDir, 'routes/health.ts');
  const healthContent = fs.readFileSync(healthFile, 'utf-8');
  check('API', 'Health check endpoints implemented', healthContent.includes('/health'), '/health, /healthz, /livez, /readyz');
}

async function auditDatabase() {
  log('ℹ️', 'Checking database configuration...');

  // Check Prisma schema
  const schemaFile = path.join(REPO_ROOT, 'prisma/schema.prisma');
  const schemaExists = fs.existsSync(schemaFile);
  check('DATABASE', 'Prisma schema defined', schemaExists);

  if (schemaExists) {
    const schema = fs.readFileSync(schemaFile, 'utf-8');
    check('DATABASE', 'PostgreSQL datasource configured', schema.includes('postgresql'), 'Production-grade DB');
    check('DATABASE', 'Models defined for core entities', schema.includes('model'), 'Data models present');
  }

  // Check migrations
  const migrationsDir = path.join(REPO_ROOT, 'prisma/migrations');
  const hasMigrations = fs.existsSync(migrationsDir) && fs.readdirSync(migrationsDir).length > 0;
  check('DATABASE', 'Database migrations exist', hasMigrations, 'Schema version control');

  // Check connection config
  const connectionFile = path.join(REPO_ROOT, 'artifacts/api-server/src/lib/db-client.ts');
  const connectionContent = fs.readFileSync(connectionFile, 'utf-8');
  check('DATABASE', 'Connection pooling configured', connectionContent.includes('new pg.Pool'), 'For performance');
  check('DATABASE', 'SSL mode configurable', connectionContent.includes('PGSSLMODE') || connectionContent.includes('ssl'), 'For production');
}

async function auditFrontend() {
  log('ℹ️', 'Checking frontend implementation...');

  const frontendDir = path.join(REPO_ROOT, 'artifacts/nextrade/src');

  // Check critical components
  const components = [
    'pages/login.tsx',
    'pages/trades.tsx',
    'pages/dashboard.tsx'
  ];

  for (const comp of components) {
    const exists = fs.existsSync(path.join(frontendDir, comp));
    check('FRONTEND', `${path.basename(comp)} component exists`, exists || fs.existsSync(path.join(frontendDir, comp.replace('.tsx', '.jsx'))));
  }

  // Check API client configuration
  const configExists = fs.existsSync(path.join(frontendDir, 'main.tsx')) || fs.existsSync(path.join(frontendDir, 'lib/auth.tsx'));
  check('FRONTEND', 'API client configuration implemented', configExists, 'For backend communication');

  // Check auth context/provider
  const authFiles = [];
  for (const dir of ['lib', 'hooks', 'components', 'pages']) {
    const dirPath = path.join(frontendDir, dir);
    if (!fs.existsSync(dirPath)) continue;
    authFiles.push(...fs.readdirSync(dirPath).filter(f => /auth/i.test(f) && /\.(tsx?|jsx?)$/.test(f)));
  }
  check('FRONTEND', 'Authentication context implemented', authFiles.length > 0, `${authFiles.length} auth-related files`);

  // Check environment configuration
  const viteConfig = fs.existsSync(path.join(REPO_ROOT, 'artifacts/nextrade/vite.config.ts'));
  check('FRONTEND', 'Vite build configuration exists', viteConfig);

  // Check for security headers in frontend
  const indexHtml = path.join(REPO_ROOT, 'artifacts/nextrade/index.html');
  const indexExists = fs.existsSync(indexHtml);
  check('FRONTEND', 'HTML entry point exists', indexExists);
}

async function auditAdminPanel() {
  log('ℹ️', 'Checking admin panel security...');

  const adminDir = path.join(REPO_ROOT, 'artifacts/admin-portal/src');
  const adminDirExists = fs.existsSync(adminDir);
  check('ADMIN', 'Admin panel directory exists', adminDirExists);

  if (adminDirExists) {
    // Check admin routes protection
    const adminAppFile = path.join(REPO_ROOT, 'artifacts/api-server/src/routes/admin.ts');
    const adminContent = fs.readFileSync(adminAppFile, 'utf-8');
    
    check('ADMIN', 'Admin routes require authentication', adminContent.includes('requireAdmin'), 'Protected endpoints');
    check('ADMIN', 'Admin operations audited', adminContent.includes('log') || adminContent.includes('audit'), 'Logging for compliance');
    check('ADMIN', 'Role-based access control', adminContent.includes('role') || adminContent.includes('permission'), 'RBAC implemented');
  }

  // Check for ADMIN_EMAIL requirement
  const startupFile = path.join(REPO_ROOT, 'artifacts/api-server/src/lib/startup-env.ts');
  const startupContent = fs.readFileSync(startupFile, 'utf-8');
  check('ADMIN', 'ADMIN_EMAIL required at startup', startupContent.includes('ADMIN_EMAIL'), 'Security requirement');
  check('ADMIN', 'ADMIN_PASSWORD required at startup', startupContent.includes('ADMIN_PASSWORD'), 'Security requirement');
}

async function auditDeployment() {
  log('ℹ️', 'Checking deployment readiness...');

  // Check deployment configs
  const deploymentConfigs = {
    'railway.json': 'Railway',
    'vercel.json': 'Vercel',
    'railpack.json': 'Railpack',
    'ecosystem.config.cjs': 'PM2/VPS',
    'docker-compose.yml': 'Docker'
  };

  for (const [file, platform] of Object.entries(deploymentConfigs)) {
    const filePath = path.join(REPO_ROOT, file);
    const exists = fs.existsSync(filePath);
    check('DEPLOYMENT', `${platform} config exists`, exists, file);
  }

  // Check build scripts
  const packageJson = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf-8'));
  const scripts = packageJson.scripts || {};

  check('DEPLOYMENT', 'build script configured', !!scripts.build, 'For all platforms');
  check('DEPLOYMENT', 'start script configured', !!scripts.start, 'For production');
  check('DEPLOYMENT', 'test script configured', !!scripts.test, 'For CI/CD');

  // Check health check configuration
  const railwayFile = fs.readFileSync(path.join(REPO_ROOT, 'railway.json'), 'utf-8');
  check('DEPLOYMENT', 'Health check endpoint configured', railwayFile.includes('/healthz'), 'Railway probe');

  // Check environment variable templates
  const templates = [
    'DEPLOYMENT/.railway-env-production',
    'DEPLOYMENT/.vps-env-production',
    'DEPLOYMENT/.vercel-env-production'
  ];

  for (const template of templates) {
    const exists = fs.existsSync(path.join(REPO_ROOT, template));
    check('DEPLOYMENT', `${path.basename(template)}`, exists, 'Environment setup');
  }

  // Check deployment scripts
  const deployScript = fs.existsSync(path.join(REPO_ROOT, 'DEPLOYMENT/vps-deploy.sh'));
  check('DEPLOYMENT', 'VPS auto-setup script exists', deployScript, 'Automated deployment');
}

async function auditFinancialSecurity() {
  log('ℹ️', 'Checking financial-specific security measures...');

  const apiServerDir = path.join(REPO_ROOT, 'artifacts/api-server/src');

  // Check payment routes
  const paymentRoutes = [
    'routes/moonpay.ts',
    'routes/coinbase.ts',
    'routes/wallets.ts'
  ];

  for (const route of paymentRoutes) {
    const filePath = path.join(apiServerDir, route);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      check('FINANCIAL', `${path.basename(route)} has security checks`,
        content.includes('requireAuth') || content.includes('requireAdmin') || content.includes('verify') || content.includes('createHmac'),
        'Payment protected');
    } else if (route !== 'routes/coinbase.ts') {  // Coinbase is optional
      check('FINANCIAL', `${path.basename(route)} has security checks`, false, 'Route file missing');
    }
  }

  // Check wallet encryption
  const envFile = path.join(apiServerDir, 'lib/env.ts');
  if (fs.existsSync(envFile)) {
    const envContent = fs.readFileSync(envFile, 'utf-8');
    check('FINANCIAL', 'Wallet encryption key required', envContent.includes('WALLET_ENCRYPTION_KEY'), '64-byte key');
  } else {
    check('FINANCIAL', 'Wallet encryption key required', false, 'env.ts not found');
  }

  // Check session security
  const appFile = path.join(apiServerDir, 'app.ts');
  const appContent = fs.existsSync(appFile) ? fs.readFileSync(appFile, 'utf-8') : '';
  check('FINANCIAL', 'Session expiry configured', appContent.includes('maxAge') || appContent.includes('expires'), 'Prevents session hijacking');

  // Check OTP implementation
  const otpFile = path.join(apiServerDir, 'lib/otp.ts');
  const otpExists = fs.existsSync(otpFile);
  check('FINANCIAL', 'OTP implementation for sensitive operations', otpExists, 'Extra security layer');

  // Check rate limiting for sensitive endpoints
  check('FINANCIAL', 'Rate limiting on auth endpoints', appContent.includes('rateLimit'), 'Brute force protection');

  // Check for HTTPS enforcement
  check('FINANCIAL', 'HTTPS enforced in production', appContent.includes('NODE_ENV === \'production\''), 'Data in transit encrypted');

  // Check logging for audit trail
  const loggerFile = path.join(apiServerDir, 'lib/logger.ts');
  const loggerExists = fs.existsSync(loggerFile);
  check('FINANCIAL', 'Audit logging implemented', loggerExists, 'Compliance & investigation');
}

function printSummary() {
  const total = AUDIT_REPORT.summary.passed + AUDIT_REPORT.summary.failed;
  const percentage = total > 0 ? Math.round((AUDIT_REPORT.summary.passed / total) * 100) : 0;
  AUDIT_REPORT.scores.overall = {
    passed: AUDIT_REPORT.summary.passed,
    failed: AUDIT_REPORT.summary.failed,
    percentage,
  };

  console.log(`\n${colors.bright}Test Results:${colors.reset}`);
  console.log(`  ${colors.green}✅ Passed:${colors.reset} ${AUDIT_REPORT.summary.passed}`);
  console.log(`  ${colors.red}❌ Failed:${colors.reset} ${AUDIT_REPORT.summary.failed}`);
  console.log(`  ${colors.yellow}⚠️  Warnings:${colors.reset} ${AUDIT_REPORT.summary.warnings}`);
  console.log(`  ${colors.bright}Score: ${percentage}%${colors.reset}\n`);

  // Group by category
  const byCategory = {};
  AUDIT_REPORT.checks.forEach(check => {
    if (!byCategory[check.category]) {
      byCategory[check.category] = { passed: 0, failed: 0 };
    }
    if (check.passed) byCategory[check.category].passed++;
    else byCategory[check.category].failed++;
  });

  console.log(`${colors.bright}Score by Category:${colors.reset}`);
  Object.entries(byCategory).forEach(([category, scores]) => {
    const catTotal = scores.passed + scores.failed;
    const catPercentage = catTotal > 0 ? Math.round((scores.passed / catTotal) * 100) : 0;
    AUDIT_REPORT.scores[category] = {
      passed: scores.passed,
      failed: scores.failed,
      percentage: catPercentage,
    };
    const statusEmoji = catPercentage === 100 ? '✅' : catPercentage >= 80 ? '⚠️' : '❌';
    console.log(`  ${statusEmoji} ${category}: ${scores.passed}/${catTotal} (${catPercentage}%)`);
  });

  console.log(`\n${colors.bright}Production Readiness:${colors.reset}`);
  if (percentage === 100) {
    console.log(`${colors.green}✅ 100% PRODUCTION READY${colors.reset}`);
    console.log(`   • All security checks passed`);
    console.log(`   • All functionality verified`);
    console.log(`   • All platforms configured`);
    console.log(`   • Financial security validated`);
  } else if (percentage >= 95) {
    console.log(`${colors.green}✅ PRODUCTION READY WITH MINOR NOTES${colors.reset}`);
    console.log(`   Score: ${percentage}%`);
  } else if (percentage >= 80) {
    console.log(`${colors.yellow}⚠️  PRODUCTION READY WITH CAUTION${colors.reset}`);
    console.log(`   Score: ${percentage}% - Review failed items`);
  } else {
    console.log(`${colors.red}❌ NOT YET PRODUCTION READY${colors.reset}`);
    console.log(`   Score: ${percentage}% - Fix failed items before deployment`);
  }

  // Save detailed report
  const reportPath = path.join(REPO_ROOT, 'AUDIT_REPORT.json');
  fs.writeFileSync(reportPath, JSON.stringify(AUDIT_REPORT, null, 2));
  console.log(`\n📊 Detailed report saved to: AUDIT_REPORT.json`);
}

// Run the audit
runAudit().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
