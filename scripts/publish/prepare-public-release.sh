#!/usr/bin/env bash
#
# Prepare a clean public release of AIResume from a PRIVATE working repository.
#
# It operates on a CLONE, never on your working tree, so your local repo is untouched.
#
#   scripts/publish/prepare-public-release.sh /path/to/output
#
# What it does, in order:
#   1. clones the current repo (all branches) to the output directory
#   2. purges files that must never be public, from EVERY commit:
#        .env.local.backup .env.local.backup2 .env.new   (real production secrets)
#        .tmp-mongo                                       (47 MB local MongoDB data dir)
#        deploy/docker/.env.stalwart                      (a real env file, not a template)
#   3. regex-redacts credentials embedded in documentation across ALL history:
#        mongodb URIs with a user:password userinfo
#        any *.mongodb.net Atlas host (leaves the real cluster identifier behind otherwise)
#   4. verifies the result and prints a verdict
#
# It does NOT push anywhere. Review, then add your remote and push.
#
set -euo pipefail

OUT="${1:-}"
if [ -z "$OUT" ]; then
  echo "usage: $0 <output-directory>" >&2
  exit 2
fi

if [ -e "$OUT" ]; then
  echo "refusing to run: '$OUT' already exists" >&2
  exit 2
fi

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

# git-filter-repo must be on PATH or given by absolute path.
FILTER_REPO="${GIT_FILTER_REPO:-$(command -v git-filter-repo || true)}"
if [ -z "$FILTER_REPO" ]; then
  echo "git-filter-repo not found. Install it, or set GIT_FILTER_REPO=/path/to/git-filter-repo" >&2
  exit 1
fi

echo "==> cloning $REPO_ROOT -> $OUT"
git clone --no-local --quiet --mirror "$REPO_ROOT" "$OUT"
cd "$OUT"

# ── content redaction rules ────────────────────────────────────────────────────
EXPR="$(mktemp)"
trap 'rm -f "$EXPR"' EXIT
cat > "$EXPR" <<'RULES'
# mongodb URI with credentials in the userinfo -> placeholder userinfo
regex:(mongodb(?:\+srv)?://)[^:@\s/`"']+:[^@\s/`"']+@==>\1<user>:<password>@
# any real Atlas host -> placeholder cluster.
# Must consume the WHOLE host; a narrower pattern leaves the real cluster id behind.
regex:[A-Za-z0-9_<>-]+(?:\.[A-Za-z0-9_<>-]+)*\.mongodb\.net==><cluster>.mongodb.net
RULES

echo "==> purging leaked paths from all history"
"$FILTER_REPO" --force \
  --invert-paths \
  --path .env.local.backup \
  --path .env.local.backup2 \
  --path .env.new \
  --path .tmp-mongo \
  --path deploy/docker/.env.stalwart

echo "==> redacting credentials in historical content"
"$FILTER_REPO" --force --replace-text "$EXPR"

echo
echo "================ VERIFICATION ================"

fail=0

check_absent() {
  local desc="$1"; shift
  if git log --all --oneline -- "$@" | grep -q .; then
    echo "  FAIL  $desc — still present in history"
    fail=1
  else
    echo "  ok    $desc — absent from all history"
  fi
}
check_absent "the three leaked env files" .env.local.backup .env.local.backup2 .env.new
check_absent "the local MongoDB data dir" .tmp-mongo
check_absent "deploy/docker/.env.stalwart" deploy/docker/.env.stalwart

# Scan every blob reachable from every ref for credential shapes.
# Buffered through a temp file on purpose: piping straight into `grep -q` makes grep exit on
# the first match, which SIGPIPEs `git cat-file` and prints spurious "write error" noise.
BLOBS="$(mktemp)"
trap 'rm -f "$EXPR" "$BLOBS"' EXIT
git rev-list --all --objects \
  | awk '{print $1}' \
  | git cat-file --batch-check='%(objecttype) %(objectname)' 2>/dev/null \
  | awk '$1=="blob"{print $2}' \
  | git cat-file --batch 2>/dev/null > "$BLOBS"
if grep -aEq 'mongodb(\+srv)?://[^:[:space:]]+:[^@[:space:]]+@|sk_live_[A-Za-z0-9]{10,}|rzp_live_[A-Za-z0-9]{10,}|AKIA[0-9A-Z]{12,}' "$BLOBS"; then
  echo "  FAIL  a credential shape still exists in some historical blob"
  fail=1
else
  echo "  ok    no credential shapes in any historical blob"
fi

echo "============================================="
if [ "$fail" -eq 0 ]; then
  echo "CLEAN. Next:"
  echo "  cd $OUT"
  echo "  git remote add origin git@github.com:<you>/AIResume.git"
  echo "  git push origin --all && git push origin --tags"
else
  echo "NOT CLEAN — do not publish. Inspect $OUT before pushing." >&2
  exit 1
fi
