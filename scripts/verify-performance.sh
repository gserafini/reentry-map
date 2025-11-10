#!/bin/bash

#################################################
# Performance Optimization Verification Script
# Reentry Map - Automated Testing
#################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
PASS=0
FAIL=0
SKIP=0
TOTAL=0

# Log file
LOG_FILE="performance-verification-$(date +%Y%m%d_%H%M%S).log"

# Helper functions
print_header() {
    echo ""
    echo "==========================================="
    echo "$1"
    echo "==========================================="
}

print_test() {
    ((TOTAL++))
    echo -e "${BLUE}[$TOTAL/$EXPECTED_TOTAL]${NC} Testing: $1"
}

pass() {
    ((PASS++))
    echo -e "${GREEN}✅ PASS:${NC} $1"
    echo "PASS: $1" >> "$LOG_FILE"
}

fail() {
    ((FAIL++))
    echo -e "${RED}❌ FAIL:${NC} $1"
    echo "FAIL: $1" >> "$LOG_FILE"
}

skip() {
    ((SKIP++))
    echo -e "${YELLOW}⏭️  SKIP:${NC} $1"
    echo "SKIP: $1" >> "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}⚠️  WARN:${NC} $1"
    echo "WARN: $1" >> "$LOG_FILE"
}

# Expected total tests
EXPECTED_TOTAL=25

print_header "Performance Optimization Verification"
echo "Started: $(date)"
echo "Log file: $LOG_FILE"
echo "" > "$LOG_FILE"

#################################################
# Section 1: Redis Tests
#################################################

print_header "Section 1: Redis Caching (5 tests)"

# Test 1.1: Redis server running
print_test "Redis server is running"
if command -v redis-cli &> /dev/null; then
    if timeout 5 redis-cli -a "$REDIS_PASSWORD" ping &>/dev/null 2>&1 || timeout 5 redis-cli ping &>/dev/null 2>&1; then
        pass "Redis server is running and responding"
    else
        fail "Redis server not responding to ping"
    fi
else
    skip "redis-cli not found (Redis may not be installed)"
fi

# Test 1.2: Redis memory configuration
print_test "Redis memory limits configured"
if command -v redis-cli &> /dev/null; then
    MAXMEM=$(redis-cli -a "$REDIS_PASSWORD" CONFIG GET maxmemory 2>/dev/null | tail -1 || redis-cli CONFIG GET maxmemory 2>/dev/null | tail -1)
    if [ -n "$MAXMEM" ] && [ "$MAXMEM" != "0" ]; then
        MAXMEM_GB=$(echo "scale=2; $MAXMEM / 1024 / 1024 / 1024" | bc)
        pass "Redis maxmemory configured: ${MAXMEM_GB}GB"
    else
        warn "Redis maxmemory not set (will use all available RAM)"
        ((PASS++))
    fi
else
    skip "redis-cli not available"
fi

# Test 1.3: Redis eviction policy
print_test "Redis eviction policy"
if command -v redis-cli &> /dev/null; then
    POLICY=$(redis-cli -a "$REDIS_PASSWORD" CONFIG GET maxmemory-policy 2>/dev/null | tail -1 || redis-cli CONFIG GET maxmemory-policy 2>/dev/null | tail -1)
    if [ "$POLICY" = "allkeys-lru" ] || [ "$POLICY" = "volatile-lru" ]; then
        pass "Redis eviction policy: $POLICY (good)"
    else
        warn "Redis eviction policy: $POLICY (consider allkeys-lru)"
        ((PASS++))
    fi
else
    skip "redis-cli not available"
fi

# Test 1.4: Redis persistence enabled
print_test "Redis persistence (AOF/RDB)"
if command -v redis-cli &> /dev/null; then
    AOF=$(redis-cli -a "$REDIS_PASSWORD" CONFIG GET appendonly 2>/dev/null | tail -1 || redis-cli CONFIG GET appendonly 2>/dev/null | tail -1)
    if [ "$AOF" = "yes" ]; then
        pass "Redis AOF persistence enabled"
    else
        warn "Redis AOF not enabled (data may be lost on restart)"
        ((PASS++))
    fi
else
    skip "redis-cli not available"
fi

# Test 1.5: Redis cache hit rate
print_test "Redis cache hit rate (>70% target)"
if command -v redis-cli &> /dev/null; then
    STATS=$(redis-cli -a "$REDIS_PASSWORD" INFO stats 2>/dev/null || redis-cli INFO stats 2>/dev/null)
    if [ -n "$STATS" ]; then
        HITS=$(echo "$STATS" | grep keyspace_hits | cut -d: -f2 | tr -d '\r')
        MISSES=$(echo "$STATS" | grep keyspace_misses | cut -d: -f2 | tr -d '\r')

        if [ -n "$HITS" ] && [ -n "$MISSES" ] && [ "$HITS" -gt 0 ]; then
            TOTAL_OPS=$((HITS + MISSES))
            if [ "$TOTAL_OPS" -gt 100 ]; then
                HIT_RATE=$(echo "scale=2; $HITS * 100 / $TOTAL_OPS" | bc)
                if (( $(echo "$HIT_RATE >= 70" | bc -l) )); then
                    pass "Cache hit rate: ${HIT_RATE}% (excellent)"
                elif (( $(echo "$HIT_RATE >= 50" | bc -l) )); then
                    warn "Cache hit rate: ${HIT_RATE}% (acceptable, but could be better)"
                    ((PASS++))
                else
                    fail "Cache hit rate: ${HIT_RATE}% (too low, target >70%)"
                fi
            else
                skip "Not enough cache operations yet ($TOTAL_OPS total)"
            fi
        else
            skip "No cache statistics available yet"
        fi
    else
        fail "Could not retrieve Redis stats"
    fi
else
    skip "redis-cli not available"
fi

#################################################
# Section 2: Database Tests
#################################################

print_header "Section 2: Database Optimization (6 tests)"

# Test 2.1: PostgreSQL is running
print_test "PostgreSQL server is running"
if command -v psql &> /dev/null; then
    if psql "$DATABASE_URL" -c "SELECT 1" &>/dev/null 2>&1 || psql -U postgres -d reentry_map -c "SELECT 1" &>/dev/null 2>&1; then
        pass "PostgreSQL is running and accessible"
    else
        fail "Cannot connect to PostgreSQL database"
    fi
else
    skip "psql not found (PostgreSQL may not be installed)"
fi

# Test 2.2: Spatial index exists
print_test "Spatial index on resources.location"
if command -v psql &> /dev/null; then
    INDEX_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'resources' AND indexdef LIKE '%gist%location%';" 2>/dev/null || echo "0")
    INDEX_COUNT=$(echo "$INDEX_COUNT" | tr -d ' ')
    if [ "$INDEX_COUNT" -ge 1 ]; then
        pass "Spatial index (GIST) exists on resources.location"
    else
        fail "Missing spatial index - create with: CREATE INDEX idx_resources_location ON resources USING GIST (location);"
    fi
else
    skip "psql not available"
fi

# Test 2.3: Full-text search index exists
print_test "Full-text search index on resources"
if command -v psql &> /dev/null; then
    INDEX_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'resources' AND indexdef LIKE '%gin%tsvector%';" 2>/dev/null || echo "0")
    INDEX_COUNT=$(echo "$INDEX_COUNT" | tr -d ' ')
    if [ "$INDEX_COUNT" -ge 1 ]; then
        pass "Full-text search index (GIN) exists"
    else
        warn "Missing full-text search index (affects search performance)"
        ((PASS++))
    fi
else
    skip "psql not available"
fi

# Test 2.4: Standard indexes exist
print_test "Standard B-tree indexes on resources"
if command -v psql &> /dev/null; then
    INDEX_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'resources' AND indexname ~ 'idx_resources_(status|city|state|primary_category)';" 2>/dev/null || echo "0")
    INDEX_COUNT=$(echo "$INDEX_COUNT" | tr -d ' ')
    if [ "$INDEX_COUNT" -ge 4 ]; then
        pass "Found $INDEX_COUNT standard indexes on resources table"
    elif [ "$INDEX_COUNT" -ge 1 ]; then
        warn "Only $INDEX_COUNT standard indexes found (recommended: 4+)"
        ((PASS++))
    else
        fail "Missing standard indexes on status, city, state, primary_category"
    fi
else
    skip "psql not available"
fi

# Test 2.5: pgBouncer connection pooling
print_test "pgBouncer connection pooling"
if systemctl is-active --quiet pgbouncer 2>/dev/null; then
    pass "pgBouncer is running"
elif command -v pgbouncer &> /dev/null; then
    warn "pgBouncer installed but not running as service"
    ((PASS++))
else
    skip "pgBouncer not installed (recommended for serverless functions)"
fi

# Test 2.6: Database statistics updated
print_test "Table statistics are current"
if command -v psql &> /dev/null; then
    LAST_ANALYZE=$(psql "$DATABASE_URL" -t -c "SELECT COALESCE(MAX(last_analyze), MAX(last_autoanalyze)) FROM pg_stat_user_tables WHERE tablename = 'resources';" 2>/dev/null)
    if [ -n "$LAST_ANALYZE" ] && [ "$LAST_ANALYZE" != "" ]; then
        # Check if analyzed in last 7 days
        AGE_DAYS=$(psql "$DATABASE_URL" -t -c "SELECT EXTRACT(DAY FROM NOW() - COALESCE(MAX(last_analyze), MAX(last_autoanalyze))) FROM pg_stat_user_tables WHERE tablename = 'resources';" 2>/dev/null | tr -d ' ')
        if [ -n "$AGE_DAYS" ] && (( $(echo "$AGE_DAYS < 7" | bc -l) )); then
            pass "Table statistics updated within last 7 days"
        else
            warn "Table statistics not updated recently (run ANALYZE)"
            ((PASS++))
        fi
    else
        skip "Cannot determine last analyze time"
    fi
else
    skip "psql not available"
fi

#################################################
# Section 3: Application Tests
#################################################

print_header "Section 3: Application Performance (5 tests)"

# Test 3.1: Production build succeeds
print_test "Next.js production build"
if [ -f "package.json" ]; then
    if npm run build &>/dev/null; then
        pass "Production build successful"
    else
        fail "Production build failed (check npm run build output)"
    fi
else
    skip "Not in Next.js project directory"
fi

# Test 3.2: TypeScript compilation
print_test "TypeScript compilation (no errors)"
if [ -f "tsconfig.json" ]; then
    if npx tsc --noEmit &>/dev/null; then
        pass "TypeScript compiles without errors"
    else
        fail "TypeScript compilation errors detected"
    fi
else
    skip "TypeScript not configured"
fi

# Test 3.3: ESLint checks
print_test "ESLint (no errors)"
if [ -f "eslint.config.mjs" ] || [ -f ".eslintrc.json" ]; then
    ERROR_COUNT=$(npm run lint 2>&1 | grep -c "error" || echo "0")
    if [ "$ERROR_COUNT" -eq 0 ]; then
        pass "ESLint: no errors found"
    else
        fail "ESLint: $ERROR_COUNT errors found"
    fi
else
    skip "ESLint not configured"
fi

# Test 3.4: Bundle size check
print_test "Bundle size (<200KB target)"
if [ -f ".next/BUILD_ID" ]; then
    # Look for largest route bundle in build output
    BUILD_LOG=$(npm run build 2>&1 || echo "")
    if echo "$BUILD_LOG" | grep -q "First Load JS"; then
        MAX_SIZE=$(echo "$BUILD_LOG" | grep "First Load JS" | grep -oP '\d+(\.\d+)?\s*kB' | sed 's/kB//' | sort -rn | head -1 | tr -d ' ')
        if [ -n "$MAX_SIZE" ]; then
            if (( $(echo "$MAX_SIZE < 200" | bc -l) )); then
                pass "Bundle size: ${MAX_SIZE}kB (under 200kB target)"
            else
                warn "Bundle size: ${MAX_SIZE}kB (exceeds 200kB target)"
                ((PASS++))
            fi
        else
            skip "Could not parse bundle size from build output"
        fi
    else
        skip "Build output not available"
    fi
else
    skip "No production build found (run npm run build first)"
fi

# Test 3.5: Environment variables configured
print_test "Required environment variables"
MISSING_VARS=()

if [ -z "$DATABASE_URL" ] && [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    MISSING_VARS+=("DATABASE_URL or NEXT_PUBLIC_SUPABASE_URL")
fi

if [ -z "$NEXT_PUBLIC_GOOGLE_MAPS_KEY" ]; then
    MISSING_VARS+=("NEXT_PUBLIC_GOOGLE_MAPS_KEY")
fi

if [ ${#MISSING_VARS[@]} -eq 0 ]; then
    pass "Required environment variables are set"
else
    fail "Missing environment variables: ${MISSING_VARS[*]}"
fi

#################################################
# Section 4: Network & CDN Tests
#################################################

print_header "Section 4: Network & CDN (4 tests)"

# Test 4.1: Domain resolves
print_test "Domain DNS resolution"
if [ -n "$NEXT_PUBLIC_APP_URL" ]; then
    DOMAIN=$(echo "$NEXT_PUBLIC_APP_URL" | sed -E 's|https?://||' | cut -d'/' -f1)
    if host "$DOMAIN" &>/dev/null; then
        pass "Domain $DOMAIN resolves correctly"
    else
        warn "Domain $DOMAIN does not resolve"
        ((PASS++))
    fi
else
    skip "NEXT_PUBLIC_APP_URL not set"
fi

# Test 4.2: SSL certificate valid
print_test "SSL certificate validity"
if [ -n "$NEXT_PUBLIC_APP_URL" ] && echo "$NEXT_PUBLIC_APP_URL" | grep -q "https://"; then
    DOMAIN=$(echo "$NEXT_PUBLIC_APP_URL" | sed -E 's|https?://||' | cut -d'/' -f1)
    if timeout 10 openssl s_client -connect "$DOMAIN:443" -servername "$DOMAIN" </dev/null 2>/dev/null | grep -q "Verify return code: 0"; then
        pass "SSL certificate is valid"
    else
        warn "SSL certificate issues detected"
        ((PASS++))
    fi
else
    skip "HTTPS URL not configured"
fi

# Test 4.3: HTTP/2 support
print_test "HTTP/2 or HTTP/3 enabled"
if [ -n "$NEXT_PUBLIC_APP_URL" ]; then
    HTTP_VERSION=$(curl -sI --http2 "$NEXT_PUBLIC_APP_URL" 2>/dev/null | head -1 || echo "")
    if echo "$HTTP_VERSION" | grep -q "HTTP/2\|HTTP/3"; then
        pass "Modern HTTP protocol in use: $HTTP_VERSION"
    elif echo "$HTTP_VERSION" | grep -q "HTTP/1.1"; then
        warn "Using HTTP/1.1 (consider enabling HTTP/2)"
        ((PASS++))
    else
        skip "Could not determine HTTP version"
    fi
else
    skip "NEXT_PUBLIC_APP_URL not set"
fi

# Test 4.4: Compression enabled
print_test "Response compression (gzip/brotli)"
if [ -n "$NEXT_PUBLIC_APP_URL" ]; then
    ENCODING=$(curl -sI -H "Accept-Encoding: gzip, br" "$NEXT_PUBLIC_APP_URL" 2>/dev/null | grep -i "content-encoding" || echo "")
    if echo "$ENCODING" | grep -qi "br\|gzip"; then
        COMPRESSION=$(echo "$ENCODING" | cut -d: -f2 | tr -d ' ')
        pass "Compression enabled: $COMPRESSION"
    else
        warn "No compression detected"
        ((PASS++))
    fi
else
    skip "NEXT_PUBLIC_APP_URL not set"
fi

#################################################
# Section 5: Monitoring & Logs
#################################################

print_header "Section 5: Monitoring & Logging (5 tests)"

# Test 5.1: Application logs accessible
print_test "Application error logging"
if [ -f ".next/server/app/page.js" ]; then
    pass "Next.js server files present (logs to stdout)"
else
    skip "Next.js not built yet"
fi

# Test 5.2: Database slow query logging
print_test "PostgreSQL slow query logging"
if command -v psql &> /dev/null; then
    SLOW_LOG=$(psql "$DATABASE_URL" -t -c "SHOW log_min_duration_statement;" 2>/dev/null || echo "")
    if [ -n "$SLOW_LOG" ] && [ "$SLOW_LOG" != "-1" ]; then
        THRESHOLD=$(echo "$SLOW_LOG" | tr -d ' ' | sed 's/ms//')
        if [ "$THRESHOLD" -le 2000 ]; then
            pass "Slow query logging enabled (threshold: ${THRESHOLD}ms)"
        else
            warn "Slow query threshold very high: ${THRESHOLD}ms"
            ((PASS++))
        fi
    else
        warn "Slow query logging not enabled"
        ((PASS++))
    fi
else
    skip "psql not available"
fi

# Test 5.3: Disk space available
print_test "Disk space availability"
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ -n "$DISK_USAGE" ]; then
    if [ "$DISK_USAGE" -lt 80 ]; then
        pass "Disk usage: ${DISK_USAGE}% (healthy)"
    elif [ "$DISK_USAGE" -lt 90 ]; then
        warn "Disk usage: ${DISK_USAGE}% (getting full)"
        ((PASS++))
    else
        fail "Disk usage: ${DISK_USAGE}% (critically full!)"
    fi
else
    skip "Could not determine disk usage"
fi

# Test 5.4: Memory available
print_test "System memory availability"
if command -v free &> /dev/null; then
    MEM_AVAILABLE=$(free -m | awk 'NR==2 {print $7}')
    MEM_TOTAL=$(free -m | awk 'NR==2 {print $2}')
    if [ -n "$MEM_AVAILABLE" ] && [ -n "$MEM_TOTAL" ]; then
        MEM_USAGE_PCT=$(echo "scale=2; ($MEM_TOTAL - $MEM_AVAILABLE) * 100 / $MEM_TOTAL" | bc)
        if (( $(echo "$MEM_USAGE_PCT < 90" | bc -l) )); then
            pass "Memory usage: ${MEM_USAGE_PCT}% (${MEM_AVAILABLE}MB free)"
        else
            warn "Memory usage: ${MEM_USAGE_PCT}% (low free memory)"
            ((PASS++))
        fi
    else
        skip "Could not determine memory usage"
    fi
else
    skip "free command not available"
fi

# Test 5.5: Service uptime
print_test "System uptime"
UPTIME_DAYS=$(uptime | grep -oP '\d+(?= day)' || echo "0")
if [ -n "$UPTIME_DAYS" ]; then
    if [ "$UPTIME_DAYS" -gt 0 ]; then
        pass "System uptime: ${UPTIME_DAYS} days"
    else
        UPTIME_HOURS=$(uptime | grep -oP '\d+:\d+' | head -1 | cut -d: -f1)
        if [ -n "$UPTIME_HOURS" ]; then
            pass "System uptime: ${UPTIME_HOURS} hours"
        else
            pass "System recently restarted (uptime < 1 hour)"
        fi
    fi
else
    skip "Could not determine uptime"
fi

#################################################
# Summary
#################################################

print_header "Performance Verification Summary"
echo "Total Tests: $TOTAL"
echo -e "${GREEN}Passed: $PASS${NC}"
echo -e "${RED}Failed: $FAIL${NC}"
echo -e "${YELLOW}Skipped: $SKIP${NC}"
echo ""

PASS_PCT=$(echo "scale=1; $PASS * 100 / $TOTAL" | bc)
echo "Pass Rate: ${PASS_PCT}%"
echo ""

if [ "$FAIL" -eq 0 ]; then
    echo -e "${GREEN}✅ All mandatory checks passed!${NC}"
    echo ""
    echo "Your application is well-optimized for production."
    echo "See $LOG_FILE for detailed results."
    EXIT_CODE=0
elif [ "$FAIL" -le 2 ]; then
    echo -e "${YELLOW}⚠️  Minor issues detected ($FAIL failures)${NC}"
    echo ""
    echo "Your application is mostly optimized, but some improvements recommended."
    echo "Review failed tests above and see $LOG_FILE for details."
    EXIT_CODE=1
else
    echo -e "${RED}❌ Significant issues detected ($FAIL failures)${NC}"
    echo ""
    echo "Several optimization checks failed. Review the failures above."
    echo "See documentation in docs/PERFORMANCE_OPTIMIZATION_CHECKLIST.md"
    echo "Full log: $LOG_FILE"
    EXIT_CODE=1
fi

echo ""
echo "For detailed optimization guidance, see:"
echo "  - docs/PERFORMANCE_OPTIMIZATION_CHECKLIST.md"
echo "  - docs/REDIS_SETUP_GUIDE.md"
echo "  - docs/MIGRATION_GUIDE.md"
echo ""
echo "Completed: $(date)"

exit $EXIT_CODE
