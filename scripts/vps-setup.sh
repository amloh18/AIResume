#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
# BuildAIResume VPS Setup Script
#
# Complete dependency installer for production VPS deployment.
# Handles: Python, Playwright, JobSpy, LinkedIn Worker, systemd services.
#
# Usage:
#   sudo bash scripts/vps-setup.sh                    # Full install
#   sudo bash scripts/vps-setup.sh --linkedin-only    # LinkedIn worker only
#   sudo bash scripts/vps-setup.sh --jobspy-only      # JobSpy worker only
#   sudo bash scripts/vps-setup.sh --status           # Check status
#   sudo bash scripts/vps-setup.sh --uninstall        # Remove services
#
# Run from project root or set PROJECT_DIR env var.
# ═══════════════════════════════════════════════════════════════════════════

set -euo pipefail

# ── Configuration ──────────────────────────────────────────────────────────

PROJECT_DIR="${PROJECT_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
VENV_DIR="${PROJECT_DIR}/scripts/.venv"
LINKEDIN_VENV_DIR="${PROJECT_DIR}/scripts/linkedin-worker/.venv"
SERVICE_USER="buildairesume"
LINKEDIN_PROFILE_DIR="/var/lib/buildairesume/browser-profiles/linkedin"
LINKEDIN_DEBUG_DIR="/var/lib/buildairesume/debug/linkedin"
LOG_DIR="/var/log/buildairesume"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# ── Helpers ────────────────────────────────────────────────────────────────

log()    { echo -e "${GREEN}[✓]${NC} $1"; }
warn()   { echo -e "${YELLOW}[!]${NC} $1"; }
err()    { echo -e "${RED}[✗]${NC} $1"; }
info()   { echo -e "${BLUE}[i]${NC} $1"; }
step()   { echo -e "\n${CYAN}═══ $1 ═══${NC}"; }

check_root() {
    if [[ $EUID -ne 0 ]]; then
        err "This script must be run as root (use sudo)"
        exit 1
    fi
}

check_python() {
    if ! command -v python3 &>/dev/null; then
        err "Python3 not found. Install Python 3.11+ first."
        exit 1
    fi
    local version
    version=$(python3 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
    info "Python version: $version"
}

# ── Step 1: System Dependencies ────────────────────────────────────────────

install_system_deps() {
    step "Step 1: System Dependencies"

    if command -v apt-get &>/dev/null; then
        info "Detected Debian/Ubuntu — installing via apt"
        apt-get update -qq
        apt-get install -y -qq \
            python3 python3-pip python3-venv \
            chromium-browser \
            libnss3 libxss1 libasound2 libatk-bridge2.0-0 libgtk-3-0 \
            libgbm-dev libdrm-dev \
            curl wget git \
            > /dev/null 2>&1
        log "System packages installed"
    elif command -v yum &>/dev/null; then
        info "Detected RHEL/CentOS — installing via yum"
        yum install -y -q \
            python3 python3-pip \
            chromium \
            nss libXScrnSaver alsa-lib atk at-spi2-atk gtk3 libdrm libgbm \
            curl wget git \
            > /dev/null 2>&1
        log "System packages installed"
    elif command -v dnf &>/dev/null; then
        info "Detected Fedora — installing via dnf"
        dnf install -y -q \
            python3 python3-pip \
            chromium \
            nss libXScrnSaver alsa-lib atk at-spi2-atk gtk3 libdrm libgbm \
            curl wget git \
            > /dev/null 2>&1
        log "System packages installed"
    else
        warn "Unknown package manager — install Python 3.11+, pip, and Chromium manually"
    fi
}

# ── Step 2: Service User ───────────────────────────────────────────────────

create_service_user() {
    step "Step 2: Service User"

    if id "$SERVICE_USER" &>/dev/null; then
        log "User '$SERVICE_USER' already exists"
    else
        useradd --system --shell /bin/bash --home-dir "/home/$SERVICE_USER" --create-home "$SERVICE_USER" 2>/dev/null || \
        useradd --system --shell /bin/false "$SERVICE_USER" 2>/dev/null
        log "Created service user: $SERVICE_USER"
    fi
}

# ── Step 3: Directories ────────────────────────────────────────────────────

create_directories() {
    step "Step 3: Directories"

    local dirs=(
        "$LINKEDIN_PROFILE_DIR"
        "$LINKEDIN_DEBUG_DIR"
        "$LOG_DIR"
        "/home/$SERVICE_USER"
    )

    for dir in "${dirs[@]}"; do
        mkdir -p "$dir"
        chmod 700 "$dir"
        chown "$SERVICE_USER:$SERVICE_USER" "$dir" 2>/dev/null || true
        log "Created: $dir (mode 700)"
    done
}

# ── Step 4: Main Python Virtualenv ─────────────────────────────────────────

setup_main_venv() {
    step "Step 4: Main Python Virtualenv (JobSpy)"

    if [[ ! -d "$VENV_DIR" ]]; then
        info "Creating virtualenv at $VENV_DIR"
        python3 -m venv "$VENV_DIR"
    fi

    source "$VENV_DIR/bin/activate"

    info "Upgrading pip..."
    pip install --upgrade pip --quiet 2>/dev/null

    info "Installing JobSpy..."
    pip install --quiet \
        jobspy \
        playwright \
        requests \
        beautifulsoup4 \
        2>/dev/null

    info "Installing Playwright Chromium..."
    playwright install chromium 2>/dev/null
    playwright install-deps chromium 2>/dev/null

    deactivate

    log "Main virtualenv ready at $VENV_DIR"
    log "JobSpy + Playwright installed"
}

# ── Step 5: LinkedIn Worker Virtualenv ──────────────────────────────────────

setup_linkedin_venv() {
    step "Step 5: LinkedIn Worker Virtualenv"

    if [[ ! -d "$LINKEDIN_VENV_DIR" ]]; then
        info "Creating LinkedIn virtualenv at $LINKEDIN_VENV_DIR"
        python3 -m venv "$LINKEDIN_VENV_DIR"
    fi

    source "$LINKEDIN_VENV_DIR/bin/activate"

    info "Upgrading pip..."
    pip install --upgrade pip --quiet 2>/dev/null

    info "Installing LinkedIn worker dependencies..."
    pip install --quiet \
        playwright \
        2>/dev/null

    info "Installing Playwright Chromium for LinkedIn worker..."
    playwright install chromium 2>/dev/null
    playwright install-deps chromium 2>/dev/null

    deactivate

    log "LinkedIn virtualenv ready at $LINKEDIN_VENV_DIR"
    log "Playwright installed"
}

# ── Step 6: Verify Installations ───────────────────────────────────────────

verify_installations() {
    step "Step 6: Verification"

    local all_ok=true

    # Check main venv
    if [[ -f "$VENV_DIR/bin/python" ]]; then
        source "$VENV_DIR/bin/activate"
        if python3 -c "from jobspy import scrape_jobs; print('JobSpy OK')" 2>/dev/null; then
            log "JobSpy: OK"
        else
            err "JobSpy: FAILED"
            all_ok=false
        fi
        if python3 -c "from playwright.sync_api import sync_playwright; print('Playwright OK')" 2>/dev/null; then
            log "Playwright (main): OK"
        else
            err "Playwright (main): FAILED"
            all_ok=false
        fi
        deactivate
    else
        err "Main virtualenv not found"
        all_ok=false
    fi

    # Check LinkedIn venv
    if [[ -f "$LINKEDIN_VENV_DIR/bin/python" ]]; then
        source "$LINKEDIN_VENV_DIR/bin/activate"
        if python3 -c "from playwright.sync_api import sync_playwright; print('Playwright OK')" 2>/dev/null; then
            log "Playwright (LinkedIn): OK"
        else
            err "Playwright (LinkedIn): FAILED"
            all_ok=false
        fi
        deactivate
    else
        warn "LinkedIn virtualenv not found (optional)"
    fi

    # Check directories
    if [[ -d "$LINKEDIN_PROFILE_DIR" && -O "$LINKEDIN_PROFILE_DIR" ]]; then
        log "Browser profile dir: OK"
    else
        warn "Browser profile dir: needs manual check"
    fi

    # Check worker scripts
    if [[ -f "$PROJECT_DIR/scripts/jobspy-worker.py" ]]; then
        log "JobSpy worker: OK"
    else
        err "JobSpy worker: MISSING"
        all_ok=false
    fi

    if [[ -f "$PROJECT_DIR/scripts/linkedin-worker/worker.py" ]]; then
        log "LinkedIn worker: OK"
    else
        err "LinkedIn worker: MISSING"
        all_ok=false
    fi

    if $all_ok; then
        log "\nAll checks passed!"
    else
        warn "\nSome checks failed — review above output"
    fi
}

# ── Step 7: Systemd Services ───────────────────────────────────────────────

install_systemd_services() {
    step "Step 7: Systemd Services"

    if ! command -v systemctl &>/dev/null; then
        warn "systemd not available — skipping service installation"
        return
    fi

    # LinkedIn Worker Service
    cat > /etc/systemd/system/buildairesume-linkedin-worker.service << SERVICEEOF
[Unit]
Description=BuildAIResume LinkedIn Worker
After=network.target mongod.service
Wants=network.target

[Service]
Type=simple
User=$SERVICE_USER
Group=$SERVICE_USER
WorkingDirectory=$PROJECT_DIR
ExecStart=$LINKEDIN_VENV_DIR/bin/python3 scripts/linkedin-worker/worker.py
Restart=on-failure
RestartSec=30
StartLimitBurst=5
StartLimitIntervalSec=300

# Environment
EnvironmentFile=-$PROJECT_DIR/.env

# Security hardening
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/lib/buildairesume
PrivateTmp=true

# Resource limits
MemoryMax=2G
CPUQuota=50%

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=buildairesume-linkedin-worker

[Install]
WantedBy=multi-user.target
SERVICEEOF

    systemctl daemon-reload
    log "LinkedIn worker service installed"
    info "To enable: systemctl enable buildairesume-linkedin-worker"
    info "To start:  systemctl start buildairesume-linkedin-worker"
}

# ── Step 8: Permissions ────────────────────────────────────────────────────

fix_permissions() {
    step "Step 8: Permissions"

    chown -R "$SERVICE_USER:$SERVICE_USER" /var/lib/buildairesume 2>/dev/null || true
    chown -R "$SERVICE_USER:$SERVICE_USER" "$LOG_DIR" 2>/dev/null || true
    chmod -R 700 /var/lib/buildairesume 2>/dev/null || true

    # Ensure worker scripts are executable
    chmod +x "$PROJECT_DIR/scripts/vps-setup.sh" 2>/dev/null || true
    chmod +x "$PROJECT_DIR/scripts/linkedin-worker/worker.py" 2>/dev/null || true
    chmod +x "$PROJECT_DIR/scripts/linkedin-worker/login_linkedin.py" 2>/dev/null || true

    log "Permissions fixed"
}

# ── Status ─────────────────────────────────────────────────────────────────

show_status() {
    step "BuildAIResume VPS Status"

    echo ""
    info "Project dir:    $PROJECT_DIR"
    info "Main venv:      $VENV_DIR"
    info "LinkedIn venv:  $LINKEDIN_VENV_DIR"
    info "Browser profile: $LINKEDIN_PROFILE_DIR"
    info "Debug dir:      $LINKEDIN_DEBUG_DIR"
    echo ""

    # Python version
    python3 --version 2>/dev/null || warn "Python3 not found"

    # Main venv
    if [[ -f "$VENV_DIR/bin/python" ]]; then
        source "$VENV_DIR/bin/activate" 2>/dev/null
        python3 -c "import jobspy; print(f'JobSpy: v{jobspy.__version__}')" 2>/dev/null || warn "JobSpy: not installed"
        python3 -c "import playwright; print(f'Playwright: v{playwright.__version__}')" 2>/dev/null || warn "Playwright: not installed (main)"
        deactivate 2>/dev/null
    else
        warn "Main venv not found"
    fi

    # LinkedIn venv
    if [[ -f "$LINKEDIN_VENV_DIR/bin/python" ]]; then
        source "$LINKEDIN_VENV_DIR/bin/activate" 2>/dev/null
        python3 -c "import playwright; print(f'Playwright (LinkedIn): v{playwright.__version__}')" 2>/dev/null || warn "Playwright: not installed (LinkedIn)"
        deactivate 2>/dev/null
    else
        warn "LinkedIn venv not found"
    fi

    # Systemd
    if command -v systemctl &>/dev/null; then
        echo ""
        info "Systemd services:"
        systemctl status buildairesume-linkedin-worker --no-pager 2>/dev/null | head -5 || info "LinkedIn worker: not installed"
    fi

    # Browser profile
    echo ""
    if [[ -d "$LINKEDIN_PROFILE_DIR" ]]; then
        local profile_size
        profile_size=$(du -sh "$LINKEDIN_PROFILE_DIR" 2>/dev/null | cut -f1)
        log "Browser profile: $profile_size"
    else
        warn "Browser profile: not created"
    fi
}

# ── Uninstall ──────────────────────────────────────────────────────────────

uninstall() {
    step "Uninstalling services"

    if command -v systemctl &>/dev/null; then
        systemctl stop buildairesume-linkedin-worker 2>/dev/null || true
        systemctl disable buildairesume-linkedin-worker 2>/dev/null || true
        rm -f /etc/systemd/system/buildairesume-linkedin-worker.service
        systemctl daemon-reload
        log "LinkedIn worker service removed"
    fi
}

# ── Main ───────────────────────────────────────────────────────────────────

main() {
    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════════════════╗"
    echo "║   BuildAIResume VPS Setup Script                    ║"
    echo "║   Dependency Installer & Service Manager            ║"
    echo "╚══════════════════════════════════════════════════════╝"
    echo -e "${NC}"

    case "${1:-}" in
        --status)
            show_status
            ;;
        --uninstall)
            check_root
            uninstall
            ;;
        --linkedin-only)
            check_root
            check_python
            create_service_user
            create_directories
            setup_linkedin_venv
            install_systemd_services
            fix_permissions
            verify_installations
            ;;
        --jobspy-only)
            check_root
            check_python
            create_service_user
            setup_main_venv
            fix_permissions
            verify_installations
            ;;
        --verify)
            verify_installations
            ;;
        *)
            check_root
            check_python
            install_system_deps
            create_service_user
            create_directories
            setup_main_venv
            setup_linkedin_venv
            install_systemd_services
            fix_permissions
            verify_installations

            echo ""
            log "═══════════════════════════════════════════════════"
            log "Setup complete!"
            echo ""
            info "Next steps:"
            info "  1. Edit .env and set LINKEDIN_ENABLED=true"
            info "  2. Run: python3 scripts/linkedin-worker/login_linkedin.py"
            info "  3. Start services:"
            info "     systemctl start buildairesume-linkedin-worker"
            info "  4. Or run manually:"
            info "     python3 scripts/linkedin-worker/worker.py"
            log "═══════════════════════════════════════════════════"
            ;;
    esac
}

main "$@"
