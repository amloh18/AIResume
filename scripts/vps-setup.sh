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

set -eo pipefail

# ── Configuration ──────────────────────────────────────────────────────────

PROJECT_DIR="${PROJECT_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
VENV_DIR="${PROJECT_DIR}/scripts/.venv"
LINKEDIN_VENV_DIR="${PROJECT_DIR}/scripts/linkedin-worker/.venv"
SERVICE_USER="buildairesume"
LINKEDIN_PROFILE_DIR="/var/lib/buildairesume/browser-profiles/linkedin"
LINKEDIN_DEBUG_DIR="/var/lib/buildairesume/debug/linkedin"
LOG_DIR="/var/log/buildairesume"

# ── Sudo / Privilege Helper ────────────────────────────────────────────────
# Executes command with root privileges whether running as root or via sudo

run_sudo() {
    if [[ $EUID -eq 0 ]]; then
        "$@"
    elif command -v sudo &>/dev/null; then
        sudo "$@"
    else
        "$@"
    fi
}

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
        if command -v sudo &>/dev/null; then
            info "Running as non-root ($USER) — using sudo for privileged commands"
        else
            warn "Running without root privileges. System package installation may require sudo."
        fi
    else
        info "Running with full root privileges"
    fi
}

check_python() {
    if ! command -v python3 &>/dev/null; then
        err "Python3 not found. Attempting to install python3..."
        if command -v apt-get &>/dev/null; then
            run_sudo apt-get update -qq && run_sudo apt-get install -y -qq python3 python3-pip python3-venv python3-full || true
        fi
    fi
    if ! command -v python3 &>/dev/null; then
        err "Python3 not found. Please install Python 3.11+ first."
        exit 1
    fi
    local version
    version=$(python3 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')" 2>/dev/null || echo "unknown")
    info "Python version: $version"
}

# ── Step 1: System Dependencies ────────────────────────────────────────────

install_system_deps() {
    step "Step 1: System Dependencies"

    if command -v apt-get &>/dev/null; then
        info "Detected Debian/Ubuntu — installing system dependencies with sudo"
        run_sudo apt-get update -qq 2>/dev/null || true
        run_sudo apt-get install -y \
            python3 python3-pip python3-venv python3-full virtualenv \
            chromium-browser \
            libnss3 libxss1 libasound2 libatk-bridge2.0-0 libgtk-3-0 \
            libgbm-dev libdrm-dev \
            curl wget git \
            2>/dev/null || warn "apt-get install reported warnings (proceeding with Python setup)"
        log "System packages installed/verified"
    elif command -v yum &>/dev/null; then
        info "Detected RHEL/CentOS — installing via yum"
        run_sudo yum install -y -q \
            python3 python3-pip \
            chromium \
            nss libXScrnSaver alsa-lib atk at-spi2-atk gtk3 libdrm libgbm \
            curl wget git \
            2>/dev/null || true
        log "System packages installed/verified"
    elif command -v dnf &>/dev/null; then
        info "Detected Fedora — installing via dnf"
        run_sudo dnf install -y -q \
            python3 python3-pip \
            chromium \
            nss libXScrnSaver alsa-lib atk at-spi2-atk gtk3 libdrm libgbm \
            curl wget git \
            2>/dev/null || true
        log "System packages installed/verified"
    else
        warn "Package manager not found (e.g. running in container) — verifying python3 & chromium directly"
    fi
}

# ── Step 2: Service User ───────────────────────────────────────────────────

create_service_user() {
    step "Step 2: Service User"

    if id "$SERVICE_USER" &>/dev/null; then
        log "User '$SERVICE_USER' already exists"
    else
        run_sudo useradd --system --shell /bin/bash --home-dir "/home/$SERVICE_USER" --create-home "$SERVICE_USER" 2>/dev/null || \
        run_sudo useradd --system --shell /bin/false "$SERVICE_USER" 2>/dev/null || true

        if id "$SERVICE_USER" &>/dev/null; then
            log "Created service user: $SERVICE_USER"
        else
            SERVICE_USER="${USER:-root}"
            log "Using current user '$SERVICE_USER' for workers"
        fi
    fi
}

# ── Step 3: Directories ────────────────────────────────────────────────────

create_directories() {
    step "Step 3: Directories"

    local dirs=(
        "$LINKEDIN_PROFILE_DIR"
        "$LINKEDIN_DEBUG_DIR"
        "$LOG_DIR"
    )

    for dir in "${dirs[@]}"; do
        run_sudo mkdir -p "$dir" 2>/dev/null || mkdir -p "$dir" 2>/dev/null || mkdir -p "$HOME/.buildairesume" 2>/dev/null || true
        run_sudo chmod 700 "$dir" 2>/dev/null || true
        run_sudo chown -R "$SERVICE_USER:$SERVICE_USER" "$dir" 2>/dev/null || true
        log "Directory verified: $dir"
    done
}

# ── Step 4: Virtualenv Builder ─────────────────────────────────────────────

create_venv() {
    local target_dir="$1"
    if [[ -f "$target_dir/bin/activate" ]]; then
        return 0
    fi
    rm -rf "$target_dir" 2>/dev/null || true

    # 1. Standard python3 -m venv
    if python3 -m venv "$target_dir" 2>/dev/null; then
        return 0
    fi

    # 2. virtualenv command
    if command -v virtualenv &>/dev/null && virtualenv "$target_dir" 2>/dev/null; then
        return 0
    fi

    # 3. python3 -m virtualenv
    if python3 -m virtualenv "$target_dir" 2>/dev/null; then
        return 0
    fi

    # 4. Install python3-venv / python3-full via apt with sudo
    if command -v apt-get &>/dev/null; then
        info "Installing python3-venv packages with sudo..."
        run_sudo apt-get update -qq 2>/dev/null || true
        run_sudo apt-get install -y python3-venv python3-full python3-pip virtualenv 2>/dev/null || true
        if python3 -m venv "$target_dir" 2>/dev/null; then
            return 0
        fi
    fi

    # 5. Fallback: venv without pip, bootstrap pip with get-pip
    if python3 -m venv --without-pip "$target_dir" 2>/dev/null; then
        curl -sS https://bootstrap.pypa.io/get-pip.py 2>/dev/null | "$target_dir/bin/python3" >/dev/null 2>&1 || true
        return 0
    fi

    return 1
}

setup_main_venv() {
    step "Step 4: Main Python Virtualenv (JobSpy)"

    info "Setting up virtualenv at $VENV_DIR..."
    if create_venv "$VENV_DIR"; then
        if [[ -f "$VENV_DIR/bin/activate" ]]; then
            # shellcheck disable=SC1091
            source "$VENV_DIR/bin/activate"

            info "Upgrading pip..."
            pip install --upgrade pip --quiet 2>/dev/null || true

            info "Installing JobSpy and scraping tools..."
            pip install --quiet \
                jobspy \
                playwright \
                requests \
                beautifulsoup4 \
                2>/dev/null || true

            info "Installing Playwright Chromium browser..."
            playwright install chromium 2>/dev/null || true
            run_sudo playwright install-deps chromium 2>/dev/null || true

            deactivate 2>/dev/null || true

            log "Main virtualenv ready at $VENV_DIR"
            log "JobSpy + Playwright installed"
        else
            err "Failed to activate main virtualenv at $VENV_DIR"
        fi
    else
        err "Failed to create main virtualenv at $VENV_DIR"
    fi
}

# ── Step 5: LinkedIn Worker Virtualenv ──────────────────────────────────────

setup_linkedin_venv() {
    step "Step 5: LinkedIn Worker Virtualenv"

    info "Setting up LinkedIn virtualenv at $LINKEDIN_VENV_DIR..."
    if create_venv "$LINKEDIN_VENV_DIR"; then
        if [[ -f "$LINKEDIN_VENV_DIR/bin/activate" ]]; then
            # shellcheck disable=SC1091
            source "$LINKEDIN_VENV_DIR/bin/activate"

            info "Upgrading pip..."
            pip install --upgrade pip --quiet 2>/dev/null || true

            info "Installing LinkedIn worker dependencies..."
            pip install --quiet \
                playwright \
                2>/dev/null || true

            info "Installing Playwright Chromium for LinkedIn worker..."
            playwright install chromium 2>/dev/null || true
            run_sudo playwright install-deps chromium 2>/dev/null || true

            deactivate 2>/dev/null || true

            log "LinkedIn virtualenv ready at $LINKEDIN_VENV_DIR"
            log "Playwright installed"
        else
            warn "LinkedIn virtualenv not activated"
        fi
    else
        warn "LinkedIn virtualenv not created (optional)"
    fi
}

# ── Step 6: Verify Installations ───────────────────────────────────────────

verify_installations() {
    step "Step 6: Verification"

    local all_ok=true

    # Check main venv
    if [[ -f "$VENV_DIR/bin/activate" ]]; then
        # shellcheck disable=SC1091
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
        deactivate 2>/dev/null || true
    else
        err "Main virtualenv not found"
        all_ok=false
    fi

    # Check LinkedIn venv
    if [[ -f "$LINKEDIN_VENV_DIR/bin/activate" ]]; then
        # shellcheck disable=SC1091
        source "$LINKEDIN_VENV_DIR/bin/activate"
        if python3 -c "from playwright.sync_api import sync_playwright; print('Playwright OK')" 2>/dev/null; then
            log "Playwright (LinkedIn): OK"
        else
            err "Playwright (LinkedIn): FAILED"
            all_ok=false
        fi
        deactivate 2>/dev/null || true
    else
        warn "LinkedIn virtualenv not found (optional)"
    fi

    # Check worker scripts
    if [[ -f "$PROJECT_DIR/scripts/jobspy-worker.py" ]]; then
        log "JobSpy worker script: OK"
    else
        err "JobSpy worker script: MISSING"
        all_ok=false
    fi

    if [[ -f "$PROJECT_DIR/scripts/linkedin-worker/worker.py" ]]; then
        log "LinkedIn worker script: OK"
    else
        warn "LinkedIn worker script: MISSING"
    fi

    if $all_ok; then
        log "All primary checks passed!"
    else
        warn "Some checks reported warnings — review above output"
    fi
}

# ── Step 7: Systemd Services ───────────────────────────────────────────────

install_systemd_services() {
    step "Step 7: Systemd Services"

    if ! command -v systemctl &>/dev/null || [[ ! -d /etc/systemd/system ]]; then
        warn "systemd not available in this environment (e.g. inside Docker) — skipping service registration"
        return
    fi

    # LinkedIn Worker Service
    local TMP_SERVICE="/tmp/buildairesume-linkedin-worker.service"
    cat > "$TMP_SERVICE" << SERVICEEOF
[Unit]
Description=BuildAIResume LinkedIn Worker
After=network.target
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

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=buildairesume-linkedin-worker

[Install]
WantedBy=multi-user.target
SERVICEEOF

    run_sudo mv "$TMP_SERVICE" /etc/systemd/system/buildairesume-linkedin-worker.service 2>/dev/null || true
    run_sudo systemctl daemon-reload 2>/dev/null || true
    log "LinkedIn worker systemd service registered"
}

# ── Step 8: Permissions ────────────────────────────────────────────────────

fix_permissions() {
    step "Step 8: Permissions"

    run_sudo chown -R "$SERVICE_USER:$SERVICE_USER" /var/lib/buildairesume 2>/dev/null || true
    run_sudo chown -R "$SERVICE_USER:$SERVICE_USER" "$LOG_DIR" 2>/dev/null || true

    # Ensure worker scripts are executable
    chmod +x "$PROJECT_DIR/scripts/vps-setup.sh" 2>/dev/null || true
    chmod +x "$PROJECT_DIR/scripts/jobspy-worker.py" 2>/dev/null || true
    chmod +x "$PROJECT_DIR/scripts/linkedin-worker/worker.py" 2>/dev/null || true
    chmod +x "$PROJECT_DIR/scripts/linkedin-worker/login_linkedin.py" 2>/dev/null || true

    log "Permissions configured"
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
    if [[ -f "$VENV_DIR/bin/activate" ]]; then
        # shellcheck disable=SC1091
        source "$VENV_DIR/bin/activate" 2>/dev/null
        python3 -c "import jobspy; print(f'JobSpy: v{jobspy.__version__}')" 2>/dev/null || warn "JobSpy: not installed"
        python3 -c "import playwright; print(f'Playwright: v{playwright.__version__}')" 2>/dev/null || warn "Playwright: not installed (main)"
        deactivate 2>/dev/null || true
    else
        warn "Main venv not found"
    fi

    # LinkedIn venv
    if [[ -f "$LINKEDIN_VENV_DIR/bin/activate" ]]; then
        # shellcheck disable=SC1091
        source "$LINKEDIN_VENV_DIR/bin/activate" 2>/dev/null
        python3 -c "import playwright; print(f'Playwright (LinkedIn): v{playwright.__version__}')" 2>/dev/null || warn "Playwright: not installed (LinkedIn)"
        deactivate 2>/dev/null || true
    else
        warn "LinkedIn venv not found"
    fi

    # Systemd
    if command -v systemctl &>/dev/null; then
        echo ""
        info "Systemd services:"
        systemctl status buildairesume-linkedin-worker --no-pager 2>/dev/null | head -5 || info "LinkedIn worker: not installed"
    fi
}

# ── Uninstall ──────────────────────────────────────────────────────────────

uninstall() {
    step "Uninstalling services"

    if command -v systemctl &>/dev/null; then
        run_sudo systemctl stop buildairesume-linkedin-worker 2>/dev/null || true
        run_sudo systemctl disable buildairesume-linkedin-worker 2>/dev/null || true
        run_sudo rm -f /etc/systemd/system/buildairesume-linkedin-worker.service 2>/dev/null || true
        run_sudo systemctl daemon-reload 2>/dev/null || true
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
            info "JobSpy & Python virtual environments are ready."
            log "═══════════════════════════════════════════════════"
            ;;
    esac
}

main "$@"
