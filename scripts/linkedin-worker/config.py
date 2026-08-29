"""
LinkedIn Worker Configuration

All configuration via environment variables. No hardcoded credentials.
"""

import os
import sys


def log(msg):
    print(f"[LinkedIn Config] {msg}", file=sys.stderr)


class LinkedInConfig:
    def __init__(self):
        self.enabled = os.environ.get("LINKEDIN_ENABLED", "false").lower() == "true"
        self.dry_run = os.environ.get("LINKEDIN_DRY_RUN", "false").lower() == "true"
        self.debug = os.environ.get("LINKEDIN_DEBUG", "false").lower() == "true"

        # Browser profile
        self.browser_profile_dir = os.environ.get(
            "LINKEDIN_BROWSER_PROFILE_DIR",
            "/var/lib/buildairesume/browser-profiles/linkedin",
        )

        # Search limits
        self.max_searches_per_run = int(os.environ.get("LINKEDIN_MAX_SEARCHES_PER_RUN", "5"))
        self.max_pages_per_search = int(os.environ.get("LINKEDIN_MAX_PAGES_PER_SEARCH", "2"))
        self.max_jobs_per_search = int(os.environ.get("LINKEDIN_MAX_JOBS_PER_SEARCH", "100"))
        self.max_runtime_seconds = int(os.environ.get("LINKEDIN_MAX_RUNTIME_SECONDS", "600"))
        self.cooldown_seconds = int(os.environ.get("LINKEDIN_COOLDOWN_SECONDS", "60"))

        # Ingestion API
        self.ingest_api_url = os.environ.get(
            "LINKEDIN_INGEST_API_URL",
            "http://127.0.0.1:3000/api/admin/ingest",
        )
        self.ingest_api_secret = os.environ.get("CRON_SECRET", "")

        # Concurrency
        self.worker_concurrency = int(os.environ.get("LINKEDIN_WORKER_CONCURRENCY", "1"))

        # Debug output
        self.debug_dir = os.environ.get(
            "LINKEDIN_DEBUG_DIR",
            "/var/lib/buildairesume/debug/linkedin",
        )

        # Validate
        if not self.enabled:
            log("LinkedIn worker is DISABLED (set LINKEDIN_ENABLED=true to enable)")

    def ensure_dirs(self):
        """Create required directories with restrictive permissions."""
        import stat

        for d in [self.browser_profile_dir, self.debug_dir]:
            try:
                os.makedirs(d, mode=0o700, exist_ok=True)
            except OSError as e:
                log(f"Warning: Could not create {d}: {e}")

    def validate(self):
        """Validate configuration. Returns (ok, reason)."""
        if not self.enabled:
            return False, "LinkedIn worker is disabled"

        if not self.browser_profile_dir:
            return False, "LINKEDIN_BROWSER_PROFILE_DIR not set"

        profile_path = self.browser_profile_dir
        if not os.path.exists(profile_path):
            log(f"Browser profile directory does not exist: {profile_path}")
            log("Run login_linkedin.py first to create the profile")
            return False, f"Browser profile not found: {profile_path}"

        return True, "OK"

    def summary(self):
        """Return config summary (no secrets)."""
        return {
            "enabled": self.enabled,
            "dry_run": self.dry_run,
            "debug": self.debug,
            "browser_profile_dir": self.browser_profile_dir,
            "max_searches_per_run": self.max_searches_per_run,
            "max_pages_per_search": self.max_pages_per_search,
            "max_jobs_per_search": self.max_jobs_per_search,
            "max_runtime_seconds": self.max_runtime_seconds,
            "cooldown_seconds": self.cooldown_seconds,
            "worker_concurrency": self.worker_concurrency,
        }
