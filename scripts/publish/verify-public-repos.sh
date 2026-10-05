#!/usr/bin/env bash
#
# verify-public-repos.sh — check the tracked set of each repository before pushing.
#
# ─────────────────────────────────────────────────────────────────────────────
# WHAT THIS REPLACED, AND WHY
#
# This script's predecessor, `prepare-public-release.sh`, cloned the repository,
# ran `git filter-repo` to purge the private paths from **every commit**, and then
# verified the result. That machinery is gone because the problem it solved is
# gone: the three repositories now start from fresh histories, so the public ones
# have never contained the private paths. There is no commit to rewrite.
#
# What remains worth doing is checking that the tracked set is what you think it
# is. That is a read-only operation, and this script is read-only.
#
# ─────────────────────────────────────────────────────────────────────────────
# WHAT IT CANNOT SEE — read this before trusting a green result
#
# It looks for **credential shapes** and for **paths that must not be published**.
# It cannot see:
#
#   * an infrastructure identifier — a VPS address, a Dokploy application id, an
#     Atlas cluster id. None of those are credential shapes.
#   * a real customer email, or an internal service topology.
#   * a hardcoded production domain that a self-hoster would inherit.
#
# That gap is not hypothetical. `.verify/docs-visibility.mjs` used to hold the
# production VPS IPv4/IPv6 and both Dokploy application ids as *detection markers*
# — in a tracked file, so the guard published exactly what it guarded — and the
# shape scanner reported "no hits" the whole time, correctly. If you want to find
# a value you know is there, **search for its literal text**, not its shape.
#
# Usage:
#   scripts/publish/verify-public-repos.sh
#
# Exit status: 0 = every check passed, 1 = at least one check failed.

set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

APP="$ROOT/apps/airesume_app"
WORKER="$ROOT/apps/resumebuilder-worker"
ADMIN="$ROOT/apps/admin"

FAILURES=0

# ── Output helpers ────────────────────────────────────────────────────────────
if [ -t 1 ]; then
  RED=$'\033[31m'; GREEN=$'\033[32m'; YELLOW=$'\033[33m'; BOLD=$'\033[1m'; DIM=$'\033[2m'; OFF=$'\033[0m'
else
  RED=''; GREEN=''; YELLOW=''; BOLD=''; DIM=''; OFF=''
fi

pass() { printf '  %s✓%s %s\n' "$GREEN" "$OFF" "$1"; }
fail() { printf '  %s✗%s %s\n' "$RED" "$OFF" "$1"; FAILURES=$((FAILURES + 1)); }
note() { printf '  %s·%s %s\n' "$DIM" "$OFF" "$1"; }
warn() { printf '  %s!%s %s\n' "$YELLOW" "$OFF" "$1"; }
section() { printf '\n%s%s%s\n' "$BOLD" "$1" "$OFF"; }

# ── Credential shapes ─────────────────────────────────────────────────────────
#
# Deliberately a SHAPE list, not an assignment list. An assignment rule
# (`SECRET_KEY=…`) fires on every template placeholder and produces permanent
# noise, and a scanner people skim is a scanner that misses the real one.
#
# The PEM rule requires 40+ characters of base64 after the header. That floor is
# what keeps `.env.example`'s `-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE`
# placeholder out of the results — `_` is not a base64 character, and the
# placeholder is 22 characters anyway. It is also tolerant of a missing
# `-----END` marker, because the real key this rule was written for had none.
CREDENTIAL_SHAPES='AIza[A-Za-z0-9_-]{20,}'
CREDENTIAL_SHAPES="$CREDENTIAL_SHAPES"'|-----BEGIN [A-Z ]*PRIVATE KEY-----[^-]{0,6}[A-Za-z0-9+/=]{40,}'
CREDENTIAL_SHAPES="$CREDENTIAL_SHAPES"'|sk_live_[A-Za-z0-9]{16,}|rk_live_[A-Za-z0-9]{16,}|rzp_live_[A-Za-z0-9]{10,}'
CREDENTIAL_SHAPES="$CREDENTIAL_SHAPES"'|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{30,}|xox[baprs]-[A-Za-z0-9-]{10,}'
CREDENTIAL_SHAPES="$CREDENTIAL_SHAPES"'|SG\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}'
CREDENTIAL_SHAPES="$CREDENTIAL_SHAPES"'|polar_(oat|pat)_[A-Za-z0-9_]{20,}'
# A connection string that carries a literal password rather than a placeholder.
CREDENTIAL_SHAPES="$CREDENTIAL_SHAPES"'|mongodb(\+srv)?://[^<[:space:]/]+:[^<[:space:]/@]+@'

# ── Tracked-set helpers ───────────────────────────────────────────────────────
tracked() { git -C "$1" ls-files; }

count_tracked() { tracked "$1" | wc -l | tr -d ' '; }

# Is this directory a repository with at least one commit?
is_repo() {
  [ -d "$1/.git" ] && git -C "$1" rev-parse --verify HEAD >/dev/null 2>&1
}

scan_credentials() {
  local repo="$1" label="$2"
  local hits
  # -I skips binary files; -E is required — BSD grep does not support `\|`
  # alternation in basic regex, and the failure mode is a silent empty result.
  hits="$(git -C "$repo" grep -nIE "$CREDENTIAL_SHAPES" -- . 2>/dev/null || true)"
  if [ -n "$hits" ]; then
    fail "$label: credential shapes in the tracked set"
    printf '%s\n' "$hits" | sed 's/^/      /' | head -20
  else
    pass "$label: no credential shapes"
  fi
}

# Files tracked that match a pattern — used for the "must not be present" checks.
tracked_matching() { git -C "$1" ls-files | grep -E "$2" || true; }

# ═════════════════════════════════════════════════════════════════════════════
section "Repositories"

for repo in "$APP" "$WORKER" "$ADMIN"; do
  name="$(basename "$repo")"
  if is_repo "$repo"; then
    pass "$name: a git repository, $(count_tracked "$repo") files tracked, HEAD $(git -C "$repo" rev-parse --short HEAD)"
  elif [ -d "$repo/.git" ]; then
    fail "$name: repository exists but has no commit"
  else
    fail "$name: not a git repository"
  fi
done

# ═════════════════════════════════════════════════════════════════════════════
section "Credentials in the tracked set"

scan_credentials "$APP" "airesume_app"
scan_credentials "$WORKER" "resumebuilder-worker"
scan_credentials "$ADMIN" "admin"

# ═════════════════════════════════════════════════════════════════════════════
section "Environment files — only templates may be tracked"

for repo in "$APP" "$WORKER" "$ADMIN"; do
  name="$(basename "$repo")"
  envfiles="$(tracked_matching "$repo" '(^|/)\.env')"
  unexpected="$(printf '%s\n' "$envfiles" | grep -vE '(^|/)\.env\.example$' | grep -v '^$' || true)"
  if [ -n "$unexpected" ]; then
    fail "$name: non-template env files are tracked"
    printf '%s\n' "$unexpected" | sed 's/^/      /'
  else
    pass "$name: only .env.example is tracked"
  fi
done

# ═════════════════════════════════════════════════════════════════════════════
section "Markdown — deny by default, allowlist by exception"

# The app publishes its README, the repository-level documents, the product guides
# and — importantly — two files under public/ that are NOT documentation at all.
# They are served as live URLs by the running app, and untracking them 404s those
# URLs with no build error to warn you.
#
# ⚠️ `docs/` is ENUMERATED, not wildcarded. An earlier revision of this script used
# `^docs/[^/]+\.md$`, which fails OPEN: any internal document dropped into that
# directory would be published, and the check would still print a tick. A denylist —
# or a wildcard allowlist — is wrong for the same reason: it can only ever know
# about the documents that already exist. Adding a fifth public guide means adding
# a line here, and that is the point.
APP_MD_ALLOW='^(README|SECURITY|CONTRIBUTING|CODE_OF_CONDUCT|CHANGELOG)\.md$'
APP_MD_ALLOW="$APP_MD_ALLOW"'|^docs/(README|app-guide|configuration|self-hosting)\.md$'
APP_MD_ALLOW="$APP_MD_ALLOW"'|^public/.*\.md$'
APP_MD_ALLOW="$APP_MD_ALLOW"'|^\.github/.*\.md$'

app_md="$(tracked_matching "$APP" '\.md$')"
app_md_bad="$(printf '%s\n' "$app_md" | grep -vE "$APP_MD_ALLOW" | grep -v '^$' || true)"
if [ -n "$app_md_bad" ]; then
  fail "airesume_app: markdown outside the allowlist"
  printf '%s\n' "$app_md_bad" | sed 's/^/      /'
else
  pass "airesume_app: every tracked markdown file is allowlisted ($(printf '%s\n' "$app_md" | grep -c . ) files)"
fi

for repo in "$WORKER" "$ADMIN"; do
  name="$(basename "$repo")"
  bad="$(tracked_matching "$repo" '\.md$' | grep -vE '^README\.md$' | grep -v '^$' || true)"
  if [ -n "$bad" ]; then
    fail "$name: markdown other than README.md is tracked"
    printf '%s\n' "$bad" | sed 's/^/      /'
  else
    pass "$name: README.md is the only tracked markdown file"
  fi
done

# The served assets are a runtime dependency, so assert them positively rather
# than trusting the allowlist above to have kept them.
if [ "$(tracked_matching "$APP" '^public/.*\.md$' | grep -c .)" -gt 0 ]; then
  pass "airesume_app: the served SEO markdown assets are tracked"
else
  warn "airesume_app: no public/**/*.md tracked — verify the served SEO assets exist and are not ignored"
fi

# ═════════════════════════════════════════════════════════════════════════════
section "The private panel must not appear in a public repository"

admin_paths="$(tracked_matching "$APP" '(^|/)(app|api)/admin/|^apps/admin/')"
if [ -n "$admin_paths" ]; then
  fail "airesume_app: admin paths are tracked in the PUBLIC repository"
  printf '%s\n' "$admin_paths" | sed 's/^/      /' | head -20
else
  pass "airesume_app: no admin paths"
fi

if [ "$(tracked_matching "$ADMIN" '\.md$' | grep -c '^README\.md$')" -eq 1 ]; then
  pass "admin: publishes only its README"
fi

# ═════════════════════════════════════════════════════════════════════════════
section "Build inputs that must be present"

for pair in "$APP:Dockerfile" "$WORKER:Dockerfile" "$WORKER:.dockerignore" "$APP:.dockerignore"; do
  repo="${pair%%:*}"; file="${pair##*:}"
  if [ -n "$(tracked_matching "$repo" "^${file}$")" ]; then
    pass "$(basename "$repo"): $file is tracked"
  else
    warn "$(basename "$repo"): $file is not tracked"
  fi
done

# ═════════════════════════════════════════════════════════════════════════════
section "Not verified by this script"

note "Infrastructure identifiers (VPS addresses, Dokploy app ids, Atlas cluster ids)"
note "Real customer emails and internal service topology"
note "Production domains hardcoded in source, which a self-hoster would inherit"
note "Whether the repositories build — see each repository's README"

# ═════════════════════════════════════════════════════════════════════════════
if [ "$FAILURES" -eq 0 ]; then
  printf '\n%s%s  ALL CHECKS PASSED%s\n' "$BOLD" "$GREEN" "$OFF"
  printf '%s  Read the "Not verified" list above before treating this as a clearance.%s\n\n' "$DIM" "$OFF"
  exit 0
else
  printf '\n%s%s  %d CHECK(S) FAILED%s\n\n' "$BOLD" "$RED" "$FAILURES" "$OFF"
  exit 1
fi
