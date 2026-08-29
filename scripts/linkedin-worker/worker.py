"""
LinkedIn Worker — Main Entry Point

Standby background worker for LinkedIn job discovery.
Reads search tasks from stdin (or auto-generates from region rotation),
performs browser-based scraping, and outputs normalized jobs to stdout.

Architecture:
  Node.js (engine.ts fetchLinkedIn) spawns this worker
  -> Worker reads search tasks from stdin (demand-driven) or auto-generates
  -> Worker uses Playwright to scrape LinkedIn
  -> Worker normalizes jobs
  -> Worker writes JSON results to stdout
  -> Worker exits

Protocol:
  Input (stdin): JSON {
    tasks: [{ keyword, location, remote, postedWithinHours }],
    regions: ["US", "GB", ...],       // optional: override region rotation
    runIndex: 0,                       // optional: for round-robin
  }
  Output (stdout): JSON { success, jobs: [...], stats: {...}, status: "..." }
  Logs: stderr (not parsed by Node)

Safety:
  - No hardcoded credentials
  - Bounded runtime and search limits
  - Graceful cancellation via SIGTERM
  - Session state detection before scraping
  - Blocks on CAPTCHA/challenge/auth requirements
"""

import sys
import os
import json
import time
import signal
from datetime import datetime, timezone

# Ensure the worker directory is in the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import LinkedInConfig, REGION_LOCATION_MAP
from scraper import LinkedInScraper, LinkedInAuthState


def log(msg):
    print(f"[LinkedIn Worker] {msg}", file=sys.stderr)


def emit_result(success, jobs=None, stats=None, status=None, error=None):
    """Emit final JSON result to stdout (parsed by Node)."""
    result = {
        "success": success,
        "jobs": jobs or [],
        "stats": stats or {"found": 0, "discovered": 0, "enriched": 0},
    }
    if status:
        result["status"] = status
    if error:
        result["error"] = error
    print(json.dumps(result), flush=True)


def build_tasks_from_regions(config, regions, keyword=None):
    """Auto-generate search tasks from a list of region codes.

    Used for round-robin / fixed strategies when the scheduler doesn't
    provide explicit tasks.
    """
    kw = keyword or config.default_keyword
    tasks = []
    for code in regions:
        location = REGION_LOCATION_MAP.get(code.upper(), code)
        tasks.append({
            "keyword": kw,
            "location": location,
            "remote": False,
            "postedWithinHours": 168,
            "regionCode": code.upper(),
        })
    return tasks


class LinkedInWorker:
    def __init__(self):
        self.config = LinkedInConfig()
        self.scraper = None
        self._cancelled = False
        self._start_time = None

    def _handle_signal(self, signum, frame):
        """Handle SIGTERM for graceful shutdown."""
        log(f"Received signal {signum}, shutting down gracefully...")
        self._cancelled = True

    async def run(self, tasks):
        """Execute LinkedIn job discovery for the given search tasks."""
        self._start_time = time.time()

        # Register signal handlers
        signal.signal(signal.SIGTERM, self._handle_signal)
        signal.signal(signal.SIGINT, self._handle_signal)

        # Validate config
        ok, reason = self.config.validate()
        if not ok:
            log(f"Configuration invalid: {reason}")
            emit_result(False, status="CONFIG_ERROR", error=reason)
            return

        log(f"Config: {self.config.summary()}")
        log(f"Processing {len(tasks)} search tasks")

        # Ensure directories exist
        self.config.ensure_dirs()

        # Initialize scraper
        self.scraper = LinkedInScraper(self.config)

        try:
            # Launch browser
            await self.scraper.start()

            # Check authentication state
            auth_state = await self.scraper.check_session()
            log(f"Authentication state: {auth_state}")

            if auth_state == LinkedInAuthState.AUTH_REQUIRED:
                log("LinkedIn session requires manual authentication")
                emit_result(False, status="AUTH_REQUIRED",
                          error="LinkedIn browser session requires manual authentication. "
                                "Run login_linkedin.py on the VPS to authenticate.")
                return

            if auth_state == LinkedInAuthState.BLOCKED:
                log("LinkedIn access is blocked")
                emit_result(False, status="BLOCKED",
                          error="LinkedIn access is blocked. "
                                "The browser profile may be restricted.")
                return

            if auth_state == LinkedInAuthState.CHALLENGE:
                log("LinkedIn challenge/CAPTCHA detected")
                emit_result(False, status="CHALLENGE",
                          error="LinkedIn is presenting a challenge or CAPTCHA. "
                                "Manually resolve it on the VPS browser profile.")
                return

            if auth_state != LinkedInAuthState.AUTHENTICATED:
                log(f"Cannot proceed — session state: {auth_state}")
                emit_result(False, status=auth_state,
                          error=f"LinkedIn session state: {auth_state}")
                return

            # Process search tasks
            all_jobs = []
            total_discovered = 0
            searches_completed = 0
            regions_searched = []

            for i, task in enumerate(tasks):
                if self._cancelled:
                    log("Cancelled — stopping")
                    break

                if searches_completed >= self.config.max_searches_per_run:
                    log(f"Reached max searches limit ({self.config.max_searches_per_run})")
                    break

                # Check runtime limit
                elapsed = time.time() - self._start_time
                if elapsed >= self.config.max_runtime_seconds:
                    log(f"Reached runtime limit ({self.config.max_runtime_seconds}s)")
                    break

                keyword = task.get("keyword", self.config.default_keyword)
                location = task.get("location", "United States")
                remote = task.get("remote", False)
                posted_within = task.get("postedWithinHours", 168)
                region_code = task.get("regionCode", "")

                log(f"Task {i + 1}/{len(tasks)}: '{keyword}' in '{location}' (remote={remote}, region={region_code})")

                try:
                    jobs = await self.scraper.discover_jobs(
                        keyword=keyword,
                        location=location,
                        remote=remote,
                        posted_within_hours=posted_within,
                        max_pages=self.config.max_pages_per_search,
                        max_jobs=self.config.max_jobs_per_search,
                    )

                    total_discovered += len(jobs)
                    searches_completed += 1
                    if region_code and region_code not in regions_searched:
                        regions_searched.append(region_code)

                    # Tag jobs with region metadata
                    for job in jobs:
                        if region_code:
                            job["regionCode"] = region_code

                    # Filter out already-seen jobs
                    new_jobs = [j for j in jobs if j.get("sourceJobId")]
                    all_jobs.extend(new_jobs)

                    log(f"Task {i + 1}: {len(new_jobs)} jobs discovered in {location}")

                    # Cooldown between searches
                    if i < len(tasks) - 1 and not self._cancelled:
                        cooldown = self.config.cooldown_seconds
                        log(f"Cooling down {cooldown}s between searches...")
                        await asyncio.sleep(cooldown)

                except Exception as e:
                    log(f"Error in task {i + 1}: {e}")
                    continue

            # Emit results
            duration = time.time() - self._start_time
            stats = {
                "found": total_discovered,
                "discovered": total_discovered,
                "enriched": len(all_jobs),
                "searchesCompleted": searches_completed,
                "regionsSearched": regions_searched,
                "durationSeconds": round(duration, 1),
            }

            log(f"Completed: {len(all_jobs)} jobs across {len(regions_searched)} regions in {duration:.1f}s")
            emit_result(True, jobs=all_jobs, stats=stats, status="completed")

        except Exception as e:
            log(f"Worker error: {e}")
            emit_result(False, status="FAILED", error=str(e))

        finally:
            # Clean up browser
            if self.scraper:
                await self.scraper.stop()


import asyncio


async def main():
    log(f"Starting at {datetime.now(timezone.utc).isoformat()}")

    # Read tasks from stdin
    try:
        input_data = sys.stdin.read()
        config = json.loads(input_data) if input_data.strip() else {}
    except json.JSONDecodeError as e:
        log(f"Invalid JSON input: {e}")
        emit_result(False, error=f"Invalid JSON input: {e}")
        return

    tasks = config.get("tasks", [])
    worker_cfg = LinkedInConfig()

    # If no explicit tasks, auto-generate from region rotation
    if not tasks:
        regions_override = config.get("regions", [])
        run_index = config.get("runIndex", 0)
        keyword = config.get("keyword")

        if regions_override:
            # Scheduler provided specific regions
            tasks = build_tasks_from_regions(worker_cfg, regions_override, keyword)
            log(f"Auto-generated {len(tasks)} tasks from scheduler-provided regions: {regions_override}")
        else:
            # Use region rotation strategy
            rotation_regions = worker_cfg.get_rotation_regions(run_index)
            if rotation_regions:
                tasks = build_tasks_from_regions(worker_cfg, rotation_regions, keyword)
                log(f"Auto-generated {len(tasks)} tasks from rotation (run #{run_index}): {rotation_regions}")
            else:
                # demand strategy with no tasks = nothing to do
                log("No tasks provided and region strategy is 'demand' — nothing to do")
                emit_result(False, error="No search tasks provided and no regions to rotate")
                return

    if not tasks:
        log("No search tasks after resolution")
        emit_result(False, error="No search tasks provided")
        return

    worker = LinkedInWorker()
    await worker.run(tasks)


if __name__ == "__main__":
    asyncio.run(main())
