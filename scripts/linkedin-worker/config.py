"""
LinkedIn Worker Configuration

All configuration via environment variables. No hardcoded credentials.
Supports demand-driven region rotation for global job discovery.
"""

import os
import sys


def log(msg):
    print(f"[LinkedIn Config] {msg}", file=sys.stderr)


# Default region pool — countries where users actually search for jobs.
# This list is intentionally broad; the scheduler picks a rotating subset
# based on demand.  The worker never searches ALL regions in one run.
DEFAULT_REGIONS = [
    "US", "CA", "GB", "IN", "AU",
    "DE", "FR", "NL", "SG", "AE",
    "IE", "CH", "SE", "PL", "ES",
    "JP", "KR", "BR", "ZA", "NZ",
]

# Country code -> LinkedIn search location string
REGION_LOCATION_MAP = {
    "US": "United States",
    "CA": "Canada",
    "GB": "United Kingdom",
    "IN": "India",
    "AU": "Australia",
    "DE": "Germany",
    "FR": "France",
    "NL": "Netherlands",
    "SG": "Singapore",
    "AE": "United Arab Emirates",
    "IE": "Ireland",
    "CH": "Switzerland",
    "SE": "Sweden",
    "PL": "Poland",
    "ES": "Spain",
    "JP": "Japan",
    "KR": "South Korea",
    "BR": "Brazil",
    "ZA": "South Africa",
    "NZ": "New Zealand",
}


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

        # ── Region rotation ────────────────────────────────────────────────
        # Strategy: "demand" ( scheduler-driven ) | "round-robin" | "fixed"
        self.region_strategy = os.environ.get("LINKEDIN_REGION_STRATEGY", "demand")

        # Comma-separated country codes.  Worker resolves each to a LinkedIn
        # search location via REGION_LOCATION_MAP.
        raw_regions = os.environ.get("LINKEDIN_REGIONS", "")
        self.regions = (
            [r.strip() for r in raw_regions.split(",") if r.strip()]
            if raw_regions
            else list(DEFAULT_REGIONS)
        )

        # How many regions to search per run (rotation window).
        self.max_regions_per_run = int(os.environ.get("LINKEDIN_MAX_REGIONS_PER_RUN", "3"))

        # Default keyword used when the scheduler doesn't provide one.
        self.default_keyword = os.environ.get("LINKEDIN_DEFAULT_KEYWORD", "software engineer")

        # Validate
        if not self.enabled:
            log("LinkedIn worker is DISABLED (set LINKEDIN_ENABLED=true to enable)")

    def resolve_region_location(self, region_code: str) -> str:
        """Map a country code to a LinkedIn search location string."""
        return REGION_LOCATION_MAP.get(region_code.upper(), region_code)

    def get_rotation_regions(self, run_index: int = 0) -> list[str]:
        """Return the subset of regions to search for this run.

        - demand: worker trusts the tasks list from stdin (scheduler provides regions)
        - round-robin: rotate through the region pool
        - fixed: always use the full region list (capped by max_regions_per_run)
        """
        if self.region_strategy == "demand":
            # Scheduler sends the exact tasks; worker doesn't override.
            # Return empty list — tasks are provided via stdin.
            return []

        if self.region_strategy == "fixed":
            return self.regions[: self.max_regions_per_run]

        # round-robin (default fallback)
        start = (run_index * self.max_regions_per_run) % len(self.regions)
        selected = []
        for i in range(self.max_regions_per_run):
            selected.append(self.regions[(start + i) % len(self.regions)])
        return selected

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
            "region_strategy": self.region_strategy,
            "regions": self.regions,
            "max_regions_per_run": self.max_regions_per_run,
            "default_keyword": self.default_keyword,
        }
