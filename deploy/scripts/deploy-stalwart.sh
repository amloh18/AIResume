#!/bin/bash

# ============================================================================
# BuildAIResume - Stalwart Mail Server Deployment Script
# ============================================================================
#
# This script deploys Stalwart Mail Server to the VPS using Docker Compose.
#
# Usage:
#   ./deploy-stalwart.sh [command]
#
# Commands:
#   deploy    - Deploy Stalwart (default)
#   status    - Check deployment status
#   logs      - View logs
#   stop      - Stop Stalwart
#   restart   - Restart Stalwart
#   test      - Test SMTP connection
#
# ============================================================================

set -e

# ============================================================================
# Configuration
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DEPLOY_DIR="$PROJECT_ROOT/deploy/docker"
ENV_FILE="$DEPLOY_DIR/.env.stalwart"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================================================
# Helper Functions
# ============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi

    # Check if Docker Compose is installed
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi

    # Check if .env file exists
    if [ ! -f "$ENV_FILE" ]; then
        log_warning ".env.stalwart file not found. Creating from example..."
        cp "$DEPLOY_DIR/.env.stalwart.example" "$ENV_FILE"
        log_warning "Please edit $ENV_FILE with your configuration before deploying."
        exit 1
    fi

    # Source environment variables
    source "$ENV_FILE"

    log_success "Prerequisites check passed"
}

check_port_availability() {
    log_info "Checking port availability..."

    # Check if ports are available
    for port in 25 587 465 8080; do
        if lsof -i :$port &> /dev/null; then
            log_warning "Port $port is already in use. Stalwart may not start correctly."
        fi
    done

    log_success "Port check completed"
}

check_dns_records() {
    log_info "Checking DNS records..."

    if [ -z "$VPS_PUBLIC_IP" ]; then
        log_warning "VPS_PUBLIC_IP not set in .env file. Skipping DNS check."
        return
    fi

    # Check if mail hostname resolves
    if command -v nslookup &> /dev/null; then
        local result=$(nslookup mail.buildairesume.com 2>/dev/null | grep "Address:" | tail -1 | awk '{print $2}')
        if [ "$result" = "$VPS_PUBLIC_IP" ]; then
            log_success "DNS record for mail.buildairesume.com is correct"
        else
            log_warning "DNS record for mail.buildairesume.com may not be configured correctly"
            log_warning "Expected: $VPS_PUBLIC_IP, Got: $result"
        fi
    fi

    log_success "DNS check completed"
}

# ============================================================================
# Deployment Functions
# ============================================================================

deploy() {
    log_info "Deploying Stalwart Mail Server..."

    # Check prerequisites
    check_prerequisites

    # Check port availability
    check_port_availability

    # Create necessary directories
    log_info "Creating necessary directories..."
    sudo mkdir -p /opt/stalwart-data
    sudo chown -R 1000:1000 /opt/stalwart-data

    # Pull the latest image
    log_info "Pulling Stalwart Docker image..."
    cd "$DEPLOY_DIR"
    docker-compose -f docker-compose.stalwart.yml pull

    # Stop existing container if running
    log_info "Stopping existing Stalwart container (if any)..."
    docker-compose -f docker-compose.stalwart.yml down 2>/dev/null || true

    # Start Stalwart
    log_info "Starting Stalwart Mail Server..."
    docker-compose -f docker-compose.stalwart.yml up -d

    # Wait for health check
    log_info "Waiting for Stalwart to become healthy..."
    sleep 10

    # Check if container is running
    if docker-compose -f docker-compose.stalwart.yml ps | grep -q "Up"; then
        log_success "Stalwart Mail Server deployed successfully!"
    else
        log_error "Failed to start Stalwart Mail Server"
        docker-compose -f docker-compose.stalwart.yml logs
        exit 1
    fi

    # Check DNS records
    check_dns_records

    log_success "Deployment completed!"
    echo ""
    log_info "Next steps:"
    log_info "1. Configure DNS records (MX, SPF, DKIM, DMARC)"
    log_info "2. Configure BuildAIResume to use Stalwart"
    log_info "3. Test SMTP connection: $0 test"
}

status() {
    log_info "Checking Stalwart status..."

    cd "$DEPLOY_DIR"
    docker-compose -f docker-compose.stalwart.yml ps

    # Check health
    if docker-compose -f docker-compose.stalwart.yml ps | grep -q "Up"; then
        log_success "Stalwart is running"
    else
        log_warning "Stalwart is not running"
    fi
}

logs() {
    log_info "Viewing Stalwart logs..."

    cd "$DEPLOY_DIR"
    docker-compose -f docker-compose.stalwart.yml logs -f --tail=100
}

stop() {
    log_info "Stopping Stalwart Mail Server..."

    cd "$DEPLOY_DIR"
    docker-compose -f docker-compose.stalwart.yml down

    log_success "Stalwart stopped"
}

restart() {
    log_info "Restarting Stalwart Mail Server..."

    cd "$DEPLOY_DIR"
    docker-compose -f docker-compose.stalwart.yml restart

    log_success "Stalwart restarted"
}

test_smtp() {
    log_info "Testing SMTP connection..."

    # Check if Stalwart is running
    if ! docker-compose -f docker-compose.stalwart.yml ps | grep -q "Up"; then
        log_error "Stalwart is not running. Deploy first: $0 deploy"
        exit 1
    fi

    # Test SMTP connection using netcat
    if nc -z localhost 587; then
        log_success "SMTP port 587 is accessible"
    else
        log_error "SMTP port 587 is not accessible"
        exit 1
    fi

    # Test with telnet if available
    if command -v telnet &> /dev/null; then
        log_info "Testing SMTP greeting..."
        timeout 5 telnet localhost 587 || log_warning "Could not connect via telnet"
    fi

    log_success "SMTP test completed"
}

# ============================================================================
# Main Script
# ============================================================================

main() {
    case "${1:-deploy}" in
        deploy)
            deploy
            ;;
        status)
            status
            ;;
        logs)
            logs
            ;;
        stop)
            stop
            ;;
        restart)
            restart
            ;;
        test)
            test_smtp
            ;;
        *)
            echo "Usage: $0 {deploy|status|logs|stop|restart|test}"
            exit 1
            ;;
    esac
}

main "$@"
