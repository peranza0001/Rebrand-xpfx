#!/bin/bash

###############################################################################
# XpressPro FX Infrastructure Monitoring & Operations Script
# 
# Purpose: Monitor production health, run diagnostics, and manage operations
# Usage: ./infrastructure-ops.sh [command]
# 
# Commands:
#   health         - Full system health check
#   logs           - Stream production logs
#   metrics        - Display system metrics
#   backup         - Create database backup
#   restore        - Restore from backup
#   scale          - Scale application instances
#   restart        - Restart services
#   troubleshoot   - Run diagnostic troubleshooting
###############################################################################

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
RAILWAY_PROJECT="rebrand-xpfx-production-1988"
API_URL="https://rebrand-xpfx-production-1988.up.railway.app"
LOG_FILE="/tmp/xpfx-ops-$(date +%Y%m%d-%H%M%S).log"

###############################################################################
# Helper Functions
###############################################################################

log_info() {
    echo -e "${BLUE}ℹ ${1}${NC}" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}✓ ${1}${NC}" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}⚠ ${1}${NC}" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}✗ ${1}${NC}" | tee -a "$LOG_FILE"
}

# Check if command exists
check_command() {
    if ! command -v "$1" &> /dev/null; then
        log_error "$1 is not installed. Please install it first."
        exit 1
    fi
}

###############################################################################
# Health Check
###############################################################################

health_check() {
    log_info "Running full system health check..."
    echo ""
    
    local failed=0
    
    # 1. API Endpoint
    log_info "Checking API endpoint..."
    if curl -sf "${API_URL}/healthz" > /dev/null 2>&1; then
        log_success "API endpoint responding"
    else
        log_error "API endpoint not responding"
        ((failed++))
    fi
    
    # 2. Database Health
    log_info "Checking database connection..."
    if curl -sf "${API_URL}/healthz/db" > /dev/null 2>&1; then
        log_success "Database connection healthy"
    else
        log_error "Database connection failed"
        ((failed++))
    fi
    
    # 3. WebSocket
    log_info "Checking WebSocket (Socket.IO)..."
    if curl -sf "${API_URL}/socket.io/?EIO=4&transport=polling" > /dev/null 2>&1; then
        log_success "WebSocket endpoint responding"
    else
        log_error "WebSocket endpoint not responding"
        ((failed++))
    fi
    
    # 4. Metrics Endpoint
    log_info "Checking metrics endpoint..."
    if curl -sf "${API_URL}/metrics" > /dev/null 2>&1; then
        log_success "Metrics endpoint available"
    else
        log_error "Metrics endpoint unavailable"
        ((failed++))
    fi
    
    # 5. Response Time
    log_info "Measuring response time..."
    local response_time=$(curl -s -w "%{time_total}" -o /dev/null "${API_URL}/dashboard" 2>&1)
    log_success "Response time: ${response_time}s"
    
    # Summary
    echo ""
    if [ $failed -eq 0 ]; then
        log_success "All health checks passed!"
        return 0
    else
        log_error "$failed health check(s) failed"
        return 1
    fi
}

###############################################################################
# Logging Functions
###############################################################################

view_logs() {
    log_info "Streaming production logs..."
    railway logs -f
}

view_error_logs() {
    log_info "Showing recent errors..."
    railway logs | grep -i "error\|fatal" | tail -20
}

view_warning_logs() {
    log_info "Showing recent warnings..."
    railway logs | grep -i "warn" | tail -20
}

###############################################################################
# Metrics Display
###############################################################################

show_metrics() {
    log_info "Fetching system metrics..."
    echo ""
    
    # Get metrics from endpoint
    local metrics=$(curl -s "${API_URL}/metrics" 2>/dev/null | grep "^# TYPE\|^[^#]" | head -30)
    
    if [ -z "$metrics" ]; then
        log_error "Could not fetch metrics"
        return 1
    fi
    
    log_info "Latest Metrics:"
    echo "$metrics"
    echo ""
    
    # Node.js info
    log_info "Application Info:"
    curl -s "${API_URL}/metrics" 2>/dev/null | grep "nodejs_version" || log_warning "Version info unavailable"
    
    # HTTP request metrics
    log_info "Recent HTTP Requests:"
    curl -s "${API_URL}/metrics" 2>/dev/null | grep "http_requests_total" | head -5 || log_warning "Request metrics unavailable"
}

###############################################################################
# Backup Operations
###############################################################################

create_backup() {
    check_command "pg_dump"
    
    log_info "Creating database backup..."
    
    local backup_file="backup-$(date +%Y%m%d-%H%M%S).sql.gz"
    local backup_path="${HOME}/backups/${backup_file}"
    
    mkdir -p "${HOME}/backups"
    
    if [ -z "${DATABASE_URL:-}" ]; then
        log_error "DATABASE_URL environment variable not set"
        return 1
    fi
    
    if pg_dump "$DATABASE_URL" | gzip > "$backup_path"; then
        log_success "Backup created: $backup_path"
        
        # Show backup size
        local size=$(du -h "$backup_path" | cut -f1)
        log_info "Backup size: $size"
        
        # Keep only last 7 backups
        log_info "Cleaning old backups (keeping last 7)..."
        ls -t "${HOME}"/backups/backup-*.sql.gz 2>/dev/null | tail -n +8 | xargs -r rm
        log_success "Cleanup complete"
    else
        log_error "Backup failed"
        return 1
    fi
}

restore_backup() {
    check_command "psql"
    
    log_info "Listing available backups..."
    ls -lh "${HOME}"/backups/backup-*.sql.gz 2>/dev/null || {
        log_error "No backups found in ${HOME}/backups/"
        return 1
    }
    
    echo ""
    log_warning "Restoring will overwrite current database!"
    read -p "Enter backup filename to restore: " backup_file
    
    local backup_path="${HOME}/backups/${backup_file}"
    
    if [ ! -f "$backup_path" ]; then
        log_error "Backup file not found: $backup_path"
        return 1
    fi
    
    if [ -z "${DATABASE_URL:-}" ]; then
        log_error "DATABASE_URL environment variable not set"
        return 1
    fi
    
    log_warning "About to restore from $backup_file"
    read -p "Type 'confirm' to proceed: " confirm
    
    if [ "$confirm" != "confirm" ]; then
        log_error "Restore cancelled"
        return 1
    fi
    
    if gunzip -c "$backup_path" | psql "$DATABASE_URL"; then
        log_success "Restore completed"
        log_info "Running migrations..."
        npx prisma migrate deploy || log_warning "Migration had issues"
        log_success "Database restored successfully"
    else
        log_error "Restore failed"
        return 1
    fi
}

###############################################################################
# Scaling Operations
###############################################################################

scale_app() {
    check_command "railway"
    
    log_info "Current scaling status:"
    railway env
    echo ""
    
    read -p "Enter desired number of instances (1-10): " instances
    
    if ! [[ "$instances" =~ ^[1-9]|10$ ]]; then
        log_error "Invalid instance count"
        return 1
    fi
    
    log_info "Scaling to $instances instances..."
    
    if railway scale web="$instances"; then
        log_success "Scaling command sent to Railway"
        log_info "New instances will be ready in 2-5 minutes"
        log_info "Monitor progress with: railway logs -f"
    else
        log_error "Scaling failed"
        return 1
    fi
}

###############################################################################
# Service Management
###############################################################################

restart_services() {
    check_command "railway"
    
    log_warning "Restarting services..."
    
    if railway restart; then
        log_success "Services restarted"
        sleep 5
        
        log_info "Waiting for services to become healthy..."
        for i in {1..30}; do
            if curl -sf "${API_URL}/healthz" > /dev/null 2>&1; then
                log_success "Services are healthy again"
                return 0
            fi
            echo -n "."
            sleep 2
        done
        
        log_error "Services did not recover within timeout"
        return 1
    else
        log_error "Restart failed"
        return 1
    fi
}

###############################################################################
# Troubleshooting
###############################################################################

troubleshoot() {
    log_info "Running diagnostic troubleshooting..."
    echo ""
    
    # 1. Check connectivity
    log_info "1. Network Connectivity"
    if ping -c 1 google.com > /dev/null 2>&1; then
        log_success "Internet connectivity: OK"
    else
        log_error "No internet connectivity"
    fi
    
    # 2. Check dependencies
    log_info "2. Required Tools"
    for tool in curl npm node psql redis-cli; do
        if command -v "$tool" &> /dev/null; then
            log_success "$tool: installed"
        else
            log_warning "$tool: not installed"
        fi
    done
    
    # 3. Check environment variables
    log_info "3. Environment Variables"
    if [ -n "${DATABASE_URL:-}" ]; then
        log_success "DATABASE_URL: set"
    else
        log_error "DATABASE_URL: not set"
    fi
    
    if [ -n "${REDIS_URL:-}" ]; then
        log_success "REDIS_URL: set"
    else
        log_warning "REDIS_URL: not set"
    fi
    
    # 4. Check log messages
    log_info "4. Recent Error Messages"
    railway logs | grep -i "error" | head -5 || log_success "No recent errors"
    
    # 5. Health check summary
    log_info "5. Health Check Summary"
    health_check || true
}

###############################################################################
# Main Command Handler
###############################################################################

show_usage() {
    cat << EOF
XpressPro FX Infrastructure Operations Tool

Usage: $0 [command] [options]

Commands:
  health         Full system health check
  logs           Stream production logs
  errors         Show recent error logs
  warnings       Show recent warning logs
  metrics        Display system metrics
  backup         Create database backup
  restore        Restore from backup
  scale          Scale application instances
  restart        Restart services
  troubleshoot   Run diagnostic troubleshooting
  help           Show this help message

Examples:
  $0 health              # Run health check
  $0 logs                # Stream logs
  $0 backup              # Create backup
  $0 scale               # Interactive scaling

Environment Variables:
  DATABASE_URL           PostgreSQL connection string
  REDIS_URL             Redis connection string
  RAILWAY_PROJECT       Railway project name (default: $RAILWAY_PROJECT)

For more information, see INFRASTRUCTURE_GUIDE.md
EOF
}

main() {
    local command="${1:-help}"
    
    case "$command" in
        health)
            health_check
            ;;
        logs)
            view_logs
            ;;
        errors)
            view_error_logs
            ;;
        warnings)
            view_warning_logs
            ;;
        metrics)
            show_metrics
            ;;
        backup)
            create_backup
            ;;
        restore)
            restore_backup
            ;;
        scale)
            scale_app
            ;;
        restart)
            restart_services
            ;;
        troubleshoot)
            troubleshoot
            ;;
        help|--help|-h)
            show_usage
            ;;
        *)
            log_error "Unknown command: $command"
            show_usage
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
