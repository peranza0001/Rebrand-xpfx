#!/bin/bash

# DEPLOYMENT VERIFICATION SCRIPT - ALL PLATFORMS
# ================================================
# This script tests the blank page fix across all supported platforms.
# 
# Usage: bash tests/verify-all-platforms.sh
#
# The script will:
# 1. Test local development server
# 2. Provide commands for testing Railway, Vercel, VPS/PM2, Docker
# 3. Generate a results report
#
# Prerequisites:
# - node (for E2E tests)
# - curl (for health checks)
# - Railway CLI installed for Railway testing
#
# NOTE: Some platforms require manual setup/deployment first

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  DEPLOYMENT VERIFICATION SCRIPT - ALL PLATFORMS        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Results tracking
RESULTS=()
PASSED=0
FAILED=0
SKIPPED=0

# Function to test a URL
test_deployment() {
    local name=$1
    local url=$2
    local type=${3:-"optional"}  # required or optional
    
    echo -e "${YELLOW}Testing $name...${NC}"
    echo "  URL: $url"
    
    # Test if server is reachable
    if curl -s -m 5 "$url/healthz" > /dev/null 2>&1 || curl -s -m 5 "$url/" > /dev/null 2>&1; then
        echo -e "${GREEN}  ✅ Server is reachable${NC}"
        
        # Run E2E tests
        if node tests/e2e-deployment-verification.test.mjs "$url" > /tmp/e2e_${name// /_}.log 2>&1; then
            echo -e "${GREEN}  ✅ All E2E tests passed${NC}"
            RESULTS+=("✅ $name: VERIFIED")
            PASSED=$((PASSED + 1))
        else
            echo -e "${RED}  ❌ E2E tests failed${NC}"
            tail -20 /tmp/e2e_${name// /_}.log
            RESULTS+=("❌ $name: E2E TESTS FAILED")
            FAILED=$((FAILED + 1))
        fi
    else
        if [ "$type" = "required" ]; then
            echo -e "${RED}  ❌ Server not reachable (required)${NC}"
            RESULTS+=("❌ $name: NOT DEPLOYED")
            FAILED=$((FAILED + 1))
        else
            echo -e "${YELLOW}  ⏭️  Server not reachable (skipping - not deployed yet)${NC}"
            RESULTS+=("⏭️  $name: NOT YET DEPLOYED")
            SKIPPED=$((SKIPPED + 1))
        fi
    fi
    echo ""
}

# Test 1: Local Development
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}1. LOCAL DEVELOPMENT${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if command -v npm &> /dev/null; then
    echo "Checking if local server needs to be started..."
    if ! curl -s -m 2 "http://localhost:5000/healthz" > /dev/null 2>&1; then
        echo -e "${YELLOW}Local server not running. To test locally:${NC}"
        echo "  1. In a new terminal, run:"
        echo "     npm run build"
        echo "     node artifacts/api-server/dist/index.mjs"
        echo "  2. Then run this script again"
        echo "  3. Or run manually:"
        echo "     node tests/e2e-deployment-verification.test.mjs http://localhost:5000"
        RESULTS+=("⏭️  Local Development: BUILD & START SERVER FIRST")
        SKIPPED=$((SKIPPED + 1))
    else
        test_deployment "Local Development" "http://localhost:5000" "required"
    fi
else
    echo -e "${RED}npm not found. Please install Node.js${NC}"
    RESULTS+=("❌ Local Development: npm not installed")
    FAILED=$((FAILED + 1))
fi
echo ""

# Test 2: Railway Production
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}2. RAILWAY PRODUCTION${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

RAILWAY_URL="https://rebrand-xpfx-production-1988.up.railway.app"
echo "Testing Railway deployment at:"
echo "  $RAILWAY_URL"
echo ""
echo "To trigger deployment if not yet deployed:"
echo "  railway login"
echo "  railway link"
echo "  railway up --skip-env-check"
echo ""

test_deployment "Railway Production" "$RAILWAY_URL" "optional"

# Test 3: Vercel
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}3. VERCEL${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo "To deploy to Vercel:"
echo "  npm install -g vercel"
echo "  vercel login"
echo "  vercel deploy --prod"
echo ""
echo "Or check your Vercel dashboard for the project URL"
echo ""

read -p "Enter your Vercel URL (or press Enter to skip): " VERCEL_URL
if [ ! -z "$VERCEL_URL" ]; then
    test_deployment "Vercel" "$VERCEL_URL" "optional"
else
    echo -e "${YELLOW}⏭️  Vercel URL not provided - skipping${NC}"
    RESULTS+=("⏭️  Vercel: URL not provided")
    SKIPPED=$((SKIPPED + 1))
fi
echo ""

# Test 4: VPS/PM2
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}4. VPS / PM2${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo "To deploy to VPS/PM2:"
echo "  ssh user@your-vps"
echo "  cd /path/to/Rebrand-xpfx"
echo "  git pull origin main"
echo "  npm install --legacy-peer-deps"
echo "  npm run build"
echo "  pm2 restart all"
echo ""

read -p "Enter your VPS URL (e.g., http://192.168.1.100:8080 or Enter to skip): " VPS_URL
if [ ! -z "$VPS_URL" ]; then
    test_deployment "VPS/PM2" "$VPS_URL" "optional"
else
    echo -e "${YELLOW}⏭️  VPS URL not provided - skipping${NC}"
    RESULTS+=("⏭️  VPS/PM2: URL not provided")
    SKIPPED=$((SKIPPED + 1))
fi
echo ""

# Test 5: Docker Compose
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}5. DOCKER COMPOSE${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo "To deploy with Docker Compose:"
echo "  docker-compose build"
echo "  docker-compose up -d"
echo ""

if command -v docker &> /dev/null && command -v docker-compose &> /dev/null; then
    echo "Docker is installed. Testing..."
    if docker ps > /dev/null 2>&1; then
        # Try to detect if docker-compose is running
        if docker ps --format '{{.Names}}' | grep -q "rebrand\|api-server\|postgres" 2>/dev/null || \
           docker-compose ps > /dev/null 2>&1; then
            test_deployment "Docker Compose" "http://localhost:5000" "optional"
        else
            echo -e "${YELLOW}⏭️  Docker containers not running${NC}"
            echo "Start with: docker-compose up -d"
            RESULTS+=("⏭️  Docker: Containers not running")
            SKIPPED=$((SKIPPED + 1))
        fi
    else
        echo -e "${YELLOW}Docker daemon not running${NC}"
        RESULTS+=("⏭️  Docker: Daemon not running")
        SKIPPED=$((SKIPPED + 1))
    fi
else
    echo -e "${YELLOW}Docker/Docker Compose not installed - skipping${NC}"
    RESULTS+=("⏭️  Docker: Not installed")
    SKIPPED=$((SKIPPED + 1))
fi
echo ""

# Final Summary
echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  VERIFICATION RESULTS SUMMARY                          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

for result in "${RESULTS[@]}"; do
    echo "$result"
done

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "Summary:"
echo -e "  ${GREEN}✅ Verified: $PASSED${NC}"
echo -e "  ${RED}❌ Failed: $FAILED${NC}"
echo -e "  ${YELLOW}⏭️  Pending: $SKIPPED${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ $FAILED -eq 0 ] && [ $PASSED -gt 0 ]; then
    echo -e "${GREEN}🎉 ALL TESTED PLATFORMS PASSED!${NC}"
    echo ""
    if [ $SKIPPED -gt 0 ]; then
        echo -e "${YELLOW}⏳ $SKIPPED platform(s) pending deployment and testing${NC}"
        echo "See messages above for deployment instructions."
    fi
    exit 0
elif [ $PASSED -eq 0 ] && [ $FAILED -eq 0 ]; then
    echo -e "${YELLOW}⏳ NO PLATFORMS TESTED YET${NC}"
    echo "Follow the instructions above to deploy and test platforms."
    exit 0
else
    echo -e "${RED}❌ SOME PLATFORMS FAILED${NC}"
    echo "See errors above and check DEPLOYMENT_TROUBLESHOOTING.md"
    exit 1
fi
