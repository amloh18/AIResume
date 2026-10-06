#!/usr/bin/env bash
#
# Install the BuildAIResume worker gateway as a systemd service.
#
# Run this ON THE VPS HOST, as root (or a sudo-capable user). It is NOT meant to run inside the
# application container — there is no systemd in there.
#
#     sudo bash scripts/vps-install-worker-gateway.sh
#     sudo bash scripts/vps-install-worker-gateway.sh --status
#     sudo bash scripts/vps-install-worker-gateway.sh --uninstall
#
# PREREQUISITE: `sudo bash scripts/vps-setup.sh` must have run first. That script creates the
# `buildairesume` user, the two virtualenvs (JobSpy + LinkedIn) and the Chromium browser. This script
# deliberately does not duplicate any of that — it only adds the HTTP front end on top.
#
# WHY THIS EXISTS
# ---------------
# The Next.js app used to spawn scripts/jobspy-worker.py and scripts/linkedin-worker/worker.py as child
# processes, which forced Python, Playwright and JobSpy into the application Docker image. Any deploy
# that missed a layer cache re-downloaded Chromium and the JobSpy dependency tree. Moving the workers
# behind this service takes them out of the deploy path entirely: the image becomes a web server, and
# the tooling is installed once, here.

set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-/opt/buildairesume}"
SERVICE_USER="${SERVICE_USER:-buildairesume}"
SERVICE_NAME="buildairesume-worker-gateway"
UNIT_PATH="/etc/systemd/system/${SERVICE_NAME}.service"
ENV_FILE="${PROJECT_DIR}/.env"
GATEWAY_PORT="${WORKER_GATEWAY_PORT:-8790}"
GATEWAY_TOKEN=""

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

check_prerequisites() {
  local failed=0

  if [[ ! -d "$PROJECT_DIR" ]]; then
    err "Project directory not found: $PROJECT_DIR"
    err "Set PROJECT_DIR=/path/to/checkout if it lives elsewhere."
    failed=1
  fi

  if [[ ! -f "${PROJECT_DIR}/scripts/worker-gateway.py" ]]; then
    err "Missing ${PROJECT_DIR}/scripts/worker-gateway.py — is the checkout up to date? (git pull)"
    failed=1
  fi

  if ! id "$SERVICE_USER" &>/dev/null; then
    err "User '$SERVICE_USER' does not exist. Run: sudo bash scripts/vps-setup.sh"
    failed=1
  fi

  local venv_jobspy="${PROJECT_DIR}/scripts/.venv/bin/python3"
  local venv_linkedin="${PROJECT_DIR}/scripts/linkedin-worker/.venv/bin/python3"

  if [[ ! -x "$venv_jobspy" ]]; then
    warn "JobSpy venv missing at $venv_jobspy — the jobspy worker will fall back to system python3."
    warn "Run: sudo bash scripts/vps-setup.sh"
  else
    ok "JobSpy venv present"
  fi

  if [[ ! -x "$venv_linkedin" ]]; then
    warn "LinkedIn venv missing at $venv_linkedin — LinkedIn discovery will fail until it exists."
    warn "Run: sudo bash scripts/vps-setup.sh --linkedin-only"
  else
    ok "LinkedIn venv present"
  fi

  [[ "$failed" -eq 0 ]] || exit 1
}

ensure_token() {
  if [[ -f "$ENV_FILE" ]] && grep -q '^WORKER_GATEWAY_TOKEN=' "$ENV_FILE" 2>/dev/null; then
    GATEWAY_TOKEN="$(grep -E '^WORKER_GATEWAY_TOKEN=' "$ENV_FILE" | tail -1 | cut -d= -f2-)"
    ok "WORKER_GATEWAY_TOKEN already set in $ENV_FILE"
    return
  fi

  local token
  token="$(openssl rand -hex 32 2>/dev/null || head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n')"

  if [[ ! -f "$ENV_FILE" ]]; then
    warn "$ENV_FILE does not exist — creating it."
    run_privileged touch "$ENV_FILE"
  fi

  printf '\n# Worker gateway auth (shared with the app as INGESTION_WORKER_TOKEN)\nWORKER_GATEWAY_TOKEN=%s\n' "$token" \
    | run_privileged tee -a "$ENV_FILE" >/dev/null
  run_privileged chmod 600 "$ENV_FILE" || true

  GATEWAY_TOKEN="$token"
  ok "Generated WORKER_GATEWAY_TOKEN"
  echo
  echo -e "${YELLOW}Add these to the application environment (Dokploy → your app → Environment):${NC}"
  echo "  INGESTION_WORKER_URL=http://$(detect_bridge_ip):${GATEWAY_PORT}"
  echo "  INGESTION_WORKER_TOKEN=${token}"
  echo
}

detect_bridge_ip() {
  local ip
  ip="$(ip -4 addr show docker0 2>/dev/null | awk '/inet /{print $2}' | cut -d/ -f1 | head -1)"
  if [[ -z "$ip" ]]; then
    ip="$(ip route 2>/dev/null | awk '/^default/{print $3}' | head -1)"
  fi
  echo "${ip:-172.17.0.1}"
}

install_unit() {
  local bridge_ip
  bridge_ip="$(detect_bridge_ip)"
  info "Docker bridge address: ${bridge_ip}"

  local tmp_unit
  tmp_unit="$(mktemp)"

  sed "s|^Environment=WORKER_GATEWAY_HOST=.*|Environment=WORKER_GATEWAY_HOST=${bridge_ip}|" \
    "${PROJECT_DIR}/scripts/${SERVICE_NAME}.service" > "$tmp_unit"

  run_privileged cp "$tmp_unit" "$UNIT_PATH"
  rm -f "$tmp_unit"

  run_privileged chown -R "${SERVICE_USER}:${SERVICE_USER}" "$PROJECT_DIR" 2>/dev/null || true
  run_privileged systemctl daemon-reload
  run_privileged systemctl enable "$SERVICE_NAME" >/dev/null 2>&1 || true
  run_privileged systemctl restart "$SERVICE_NAME"

  ok "Installed $UNIT_PATH"
}

verify() {
  info "Waiting for the gateway to come up..."
  local attempts=0

  # /live is unauthenticated, so readiness can be checked before we know whether the token took effect.
  until [[ "$attempts" -ge 20 ]]; do
    if curl -fsS --max-time 2 "http://127.0.0.1:${GATEWAY_PORT}/live" >/dev/null 2>&1; then
      break
    fi
    attempts=$((attempts + 1))
    sleep 1
  done

  if ! curl -fsS --max-time 3 "http://127.0.0.1:${GATEWAY_PORT}/live" >/dev/null 2>&1; then
    err "Gateway did not respond on 127.0.0.1:${GATEWAY_PORT}."
    echo
    run_privileged journalctl -u "$SERVICE_NAME" -n 40 --no-pager || true
    exit 1
  fi
  ok "Gateway is listening."

  echo
  info "Health (token-authenticated):"
  local health_json
  if ! health_json="$(curl -fsS --max-time 5 \
        -H "Authorization: Bearer ${GATEWAY_TOKEN}" \
        "http://127.0.0.1:${GATEWAY_PORT}/health" 2>/dev/null)"; then
    err "The gateway rejected the token in ${ENV_FILE}."
    err "Confirm WORKER_GATEWAY_TOKEN is set there, then: sudo systemctl restart ${SERVICE_NAME}"
    exit 1
  fi
  echo "$health_json" | python3 -m json.tool 2>/dev/null || echo "$health_json"

  echo
  ok "Gateway is running."
  echo
  info "Verify the app container can reach it:"
  echo "  docker exec -it <app-container> curl -s --max-time 5 http://$(detect_bridge_ip):${GATEWAY_PORT}/live"
  echo
  info "Until INGESTION_WORKER_URL is set on the app, ingestion keeps using the in-process spawn path."
}

show_status() {
  run_privileged systemctl status "$SERVICE_NAME" --no-pager || true
  echo

  if [[ -z "$GATEWAY_TOKEN" ]]; then
    GATEWAY_TOKEN="$(grep -E '^WORKER_GATEWAY_TOKEN=' "$ENV_FILE" 2>/dev/null | tail -1 | cut -d= -f2-)"
  fi

  local body
  if body="$(curl -fsS --max-time 5 -H "Authorization: Bearer ${GATEWAY_TOKEN}" \
        "http://127.0.0.1:${GATEWAY_PORT}/health" 2>/dev/null)"; then
    echo "$body" | python3 -m json.tool 2>/dev/null || echo "$body"
  else
    warn "Health unreachable, or the token in ${ENV_FILE} was rejected."
    curl -fsS --max-time 3 "http://127.0.0.1:${GATEWAY_PORT}/live" 2>/dev/null \
      || warn "Nothing is listening on 127.0.0.1:${GATEWAY_PORT}."
  fi
}

uninstall() {
  warn "Stopping and removing ${SERVICE_NAME}..."
  run_privileged systemctl stop "$SERVICE_NAME" 2>/dev/null || true
  run_privileged systemctl disable "$SERVICE_NAME" 2>/dev/null || true
  run_privileged rm -f "$UNIT_PATH"
  run_privileged systemctl daemon-reload
  ok "Removed. The virtualenvs, browser profiles and .env are left untouched."
  warn "The app will now use the in-process spawn path — make sure INGESTION_WORKER_URL is unset."
}

main() {
  case "${1:-install}" in
    --status)    require_host; show_status ;;
    --uninstall) require_host; uninstall ;;
    install|"")  require_host; check_prerequisites; ensure_token; install_unit; verify ;;
    *)           err "Unknown option: $1"; echo "Usage: $0 [install|--status|--uninstall]"; exit 1 ;;
  esac
}

main "${1:-install}"
