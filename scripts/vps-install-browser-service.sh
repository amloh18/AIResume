#!/usr/bin/env bash
#
# Install the BuildAIResume browser service as a systemd unit.
#
# Run this ON THE VPS HOST, as root (or a sudo-capable user). It is NOT meant to run inside the
# application container — there is no systemd in there.
#
#     sudo bash scripts/vps-install-browser-service.sh
#     sudo bash scripts/vps-install-browser-service.sh --status
#     sudo bash scripts/vps-install-browser-service.sh --uninstall
#
# WHY THIS EXISTS
# ---------------
# The web image no longer contains Chromium (see `docs/deployment/vps-automation-workers.md`, Stage 2).
# Two subsystems still need a real browser:
#
#   - `unifiedApplyService.ts` → Playwright, for Greenhouse/Lever/Ashby/Workable form filling
#   - `puppeteerPoolService.ts` → Puppeteer, for rendering a resume template to PDF
#
# Both now attach to this one Chrome over the Chrome DevTools Protocol instead of launching their own.
# The browser is installed once on the host, survives application deploys, and keeps its own profile.
#
# PREREQUISITE: `sudo bash scripts/vps-setup.sh` should have run first (it creates the `buildairesume`
# user and installs Chromium plus its runtime libraries).
#
# SECURITY — READ THIS
# --------------------
# The DevTools protocol has NO authentication. Whoever can reach this port can drive the browser. The
# unit therefore binds to the Docker bridge address only, never to a public interface. Do not open
# 9222/tcp in the firewall, do not publish it through Cloudflare, and do not change
# --remote-debugging-address to 0.0.0.0.

set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-/opt/buildairesume}"
SERVICE_USER="${SERVICE_USER:-buildairesume}"
SERVICE_NAME="buildairesume-browser"
UNIT_PATH="/etc/systemd/system/${SERVICE_NAME}.service"
ENV_FILE="${PROJECT_DIR}/.env"
BROWSER_PORT="${BROWSER_PORT:-9222}"
BROWSER_BIN="${BROWSER_BIN:-}"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
info() { echo -e "${BLUE}[info]${NC} $*"; }
ok()   { echo -e "${GREEN}[ ok ]${NC} $*"; }
warn() { echo -e "${YELLOW}[warn]${NC} $*"; }
err()  { echo -e "${RED}[fail]${NC} $*" >&2; }

run_privileged() {
  if [[ "$(id -u)" -eq 0 ]]; then "$@"; elif command -v sudo &>/dev/null; then sudo "$@"; else "$@"; fi
}

require_host() {
  if [[ ! -d /etc/systemd/system ]] || ! command -v systemctl &>/dev/null; then
    err "No systemd here. This script must run on the VPS host, not inside a container."
    err "If you are inside the app container, exit it and run this over SSH on the host."
    exit 1
  fi
}

detect_bridge_ip() {
  local ip
  ip="$(ip -4 addr show docker0 2>/dev/null | awk '/inet /{print $2}' | cut -d/ -f1 | head -1)"
  if [[ -z "$ip" ]]; then
    ip="$(ip route 2>/dev/null | awk '/^default/{print $3}' | head -1)"
  fi
  echo "${ip:-172.17.0.1}"
}

# Find a Chromium to serve. Playwright's cached build is preferred over a system package because
# vps-setup.sh already installed it together with its runtime libraries and fonts.
detect_browser_bin() {
  if [[ -n "$BROWSER_BIN" ]]; then
    echo "$BROWSER_BIN"
    return
  fi

  local candidate
  for candidate in chromium chromium-browser google-chrome google-chrome-stable; do
    if command -v "$candidate" &>/dev/null; then
      command -v "$candidate"
      return
    fi
  done

  local search_dirs=(
    "/var/lib/${SERVICE_USER}/.cache/ms-playwright"
    "${PROJECT_DIR}/scripts/.venv"
    "/root/.cache/ms-playwright"
    "${HOME:-/root}/.cache/ms-playwright"
    "/opt/ms-playwright"
  )

  local dir match
  for dir in "${search_dirs[@]}"; do
    [[ -d "$dir" ]] || continue
    # Full Chromium first, then the headless shell (which is enough for CDP + printToPDF).
    match="$(ls -d "$dir"/chromium-*/chrome-linux/chrome 2>/dev/null | sort -V | tail -1 || true)"
    if [[ -z "$match" ]]; then
      match="$(ls -d "$dir"/chromium_headless_shell-*/chrome-linux/headless_shell 2>/dev/null | sort -V | tail -1 || true)"
    fi
    if [[ -n "$match" && -x "$match" ]]; then
      echo "$match"
      return
    fi
  done

  echo ""
}

check_prerequisites() {
  local failed=0

  if [[ ! -d "$PROJECT_DIR" ]]; then
    err "Project directory not found: $PROJECT_DIR"
    err "Set PROJECT_DIR=/path/to/checkout if it lives elsewhere."
    failed=1
  fi

  if [[ ! -f "${PROJECT_DIR}/scripts/${SERVICE_NAME}.service" ]]; then
    err "Missing ${PROJECT_DIR}/scripts/${SERVICE_NAME}.service — is the checkout up to date? (git pull)"
    failed=1
  fi

  if ! id "$SERVICE_USER" &>/dev/null; then
    err "User '$SERVICE_USER' does not exist. Run: sudo bash scripts/vps-setup.sh"
    failed=1
  fi

  BROWSER_BIN="$(detect_browser_bin)"
  if [[ -z "$BROWSER_BIN" ]]; then
    err "No Chromium found. Install it, or point BROWSER_BIN at the binary."
    err "  sudo bash scripts/vps-setup.sh          # installs Chromium + runtime libraries"
    err "  BROWSER_BIN=/usr/bin/chromium sudo bash $0"
    failed=1
  else
    ok "Chromium: ${BROWSER_BIN}"
  fi

  [[ "$failed" -eq 0 ]] || exit 1
}

# Resume PDFs are rendered from templates that rely on real fonts. A browser with no fonts installed
# produces pages full of boxes, which is worse than an obvious failure — so warn loudly.
check_fonts() {
  if ! command -v fc-list &>/dev/null; then
    warn "fontconfig is not installed — PDF text metrics may be wrong."
    warn "Install it: sudo apt-get install -y fontconfig fonts-liberation fonts-noto-color-emoji"
    return
  fi

  local count
  count="$(fc-list 2>/dev/null | wc -l | tr -d ' ')"
  if [[ "${count:-0}" -lt 5 ]]; then
    warn "Only ${count} fonts are visible to the system. Rendered PDFs will look wrong."
    warn "Install them: sudo apt-get install -y fonts-liberation fonts-noto-color-emoji"
  else
    ok "${count} fonts available"
  fi
}

install_unit() {
  local bridge_ip
  bridge_ip="$(detect_bridge_ip)"
  info "Docker bridge address: ${bridge_ip}"
  info "DevTools port:         ${BROWSER_PORT}"

  local profile_dir="/var/lib/${SERVICE_USER}/browser"
  run_privileged mkdir -p "${profile_dir}/cdp"
  run_privileged chown -R "${SERVICE_USER}:${SERVICE_USER}" "$profile_dir"

  local tmp_unit
  tmp_unit="$(mktemp)"

  sed -e "s|^ExecStart=/usr/bin/chromium|ExecStart=${BROWSER_BIN}|" \
      -e "s|^Environment=HOME=.*|Environment=HOME=/var/lib/${SERVICE_USER}|" \
      -e "s|--remote-debugging-address=[0-9.]*|--remote-debugging-address=${bridge_ip}|" \
      -e "s|--remote-debugging-port=[0-9]*|--remote-debugging-port=${BROWSER_PORT}|" \
      -e "s|--user-data-dir=[^ ]*|--user-data-dir=${profile_dir}/cdp|" \
      -e "s|^EnvironmentFile=-/opt/buildairesume/.env|EnvironmentFile=-${ENV_FILE}|" \
      "${PROJECT_DIR}/scripts/${SERVICE_NAME}.service" > "$tmp_unit"

  run_privileged cp "$tmp_unit" "$UNIT_PATH"
  rm -f "$tmp_unit"

  run_privileged systemctl daemon-reload
  run_privileged systemctl enable "$SERVICE_NAME" >/dev/null 2>&1 || true
  run_privileged systemctl restart "$SERVICE_NAME"

  ok "Installed $UNIT_PATH"
}

verify() {
  local bridge_ip
  bridge_ip="$(detect_bridge_ip)"

  info "Waiting for Chrome to expose the DevTools endpoint..."
  local attempts=0
  until [[ "$attempts" -ge 20 ]]; do
    if curl -fsS --max-time 2 "http://127.0.0.1:${BROWSER_PORT}/json/version" >/dev/null 2>&1; then
      break
    fi
    attempts=$((attempts + 1))
    sleep 1
  done

  local version_json
  if ! version_json="$(curl -fsS --max-time 5 "http://127.0.0.1:${BROWSER_PORT}/json/version" 2>/dev/null)"; then
    err "Nothing answered on 127.0.0.1:${BROWSER_PORT}/json/version."
    echo
    run_privileged journalctl -u "$SERVICE_NAME" -n 40 --no-pager || true
    exit 1
  fi

  ok "Browser service is up."
  echo "$version_json" | python3 -m json.tool 2>/dev/null || echo "$version_json"
  echo

  local ws_url
  ws_url="$(printf '%s' "$version_json" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("webSocketDebuggerUrl",""))' 2>/dev/null || true)"

  echo -e "${YELLOW}Add these to the application environment (Dokploy → your app → Environment):${NC}"
  echo "  PLAYWRIGHT_REMOTE_URL=http://${bridge_ip}:${BROWSER_PORT}"
  echo "  PUPPETEER_BROWSER_WS_ENDPOINT=http://${bridge_ip}:${BROWSER_PORT}"
  echo
  echo "The app also accepts the browser-level WebSocket URL directly:"
  echo "  PLAYWRIGHT_REMOTE_URL=${ws_url:-ws://${bridge_ip}:${BROWSER_PORT}/devtools/browser/<id>}"
  echo
  info "Verify the app container can reach it:"
  echo "  docker exec -it <app-container> sh -c 'curl -s --max-time 5 http://${bridge_ip}:${BROWSER_PORT}/json/version'"
  echo
  info "Then confirm in the app log after an auto-apply or a PDF export:"
  echo "  [Browser] connecting Playwright to remote Chrome over CDP: http://${bridge_ip}:${BROWSER_PORT}"
  echo
  warn "Do not expose port ${BROWSER_PORT} publicly — the DevTools protocol is unauthenticated."
  if command -v ufw &>/dev/null && run_privileged ufw status 2>/dev/null | grep -q "Status: active"; then
    if run_privileged ufw status 2>/dev/null | grep -qE "^${BROWSER_PORT}(/tcp)?\s+ALLOW"; then
      err "ufw allows ${BROWSER_PORT} from anywhere. Remove that rule: sudo ufw delete allow ${BROWSER_PORT}"
    else
      ok "ufw has no rule opening ${BROWSER_PORT}"
    fi
  fi
  echo
  warn "Without the above env vars the app never launches a browser in production:"
  warn "auto-apply routes applications to manual review and PDF export falls back to jsPDF."
}

show_status() {
  run_privileged systemctl status "$SERVICE_NAME" --no-pager || true
  echo
  if curl -fsS --max-time 5 "http://127.0.0.1:${BROWSER_PORT}/json/version" 2>/dev/null; then
    echo
  else
    warn "Nothing is listening on 127.0.0.1:${BROWSER_PORT}."
  fi
}

uninstall() {
  warn "Stopping and removing ${SERVICE_NAME}..."
  run_privileged systemctl stop "$SERVICE_NAME" 2>/dev/null || true
  run_privileged systemctl disable "$SERVICE_NAME" 2>/dev/null || true
  run_privileged rm -f "$UNIT_PATH"
  run_privileged systemctl daemon-reload
  ok "Removed. Chromium and the browser profile are left untouched."
  warn "The app will now report no browser available: auto-apply falls back to manual review and"
  warn "PDF export falls back to jsPDF. Revert the app env vars if you are rolling back entirely."
}

main() {
  case "${1:-install}" in
    --status)    require_host; show_status ;;
    --uninstall) require_host; uninstall ;;
    install|"")  require_host; check_prerequisites; check_fonts; install_unit; verify ;;
    *)           err "Unknown option: $1"; echo "Usage: $0 [install|--status|--uninstall]"; exit 1 ;;
  esac
}

main "${1:-install}"
