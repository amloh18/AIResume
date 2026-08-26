"""
JobSpy Worker - Disposable subprocess for CVCircle ingestion

Called by Node.js via: python3 scripts/jobspy-worker.py
Reads JSON config from stdin, writes JSON result to stdout, logs to stderr.
Exits immediately after producing output.

Input (stdin):
{
  "sites": ["indeed", "linkedin", "zip_recruiter"],
  "searchTerm": "software engineer",
  "location": "United States",
  "resultsWanted": 20,
  "hoursOld": 72
}

Output (stdout):
{
  "success": true,
  "jobs": [],
  "stats": { "found": 0 }
}
"""

import sys
import json
from datetime import datetime


def log(msg):
    """Diagnostic output goes to stderr (not parsed by Node)."""
    print(f"[JobSpy Worker] {msg}", file=sys.stderr)


def emit_result(success, jobs=None, stats=None, error=None):
    """Emit final JSON result to stdout (parsed by Node)."""
    result = {
        "success": success,
        "jobs": jobs or [],
        "stats": stats or {"found": 0},
    }
    if error:
        result["error"] = error
    print(json.dumps(result), flush=True)


def main():
    log(f"Starting at {datetime.now().isoformat()}")

    # Read config from stdin
    try:
        input_data = sys.stdin.read()
        config = json.loads(input_data) if input_data.strip() else {}
    except json.JSONDecodeError as e:
        log(f"Invalid JSON input: {e}")
        emit_result(False, error=f"Invalid JSON input: {e}")
        return

    sites = config.get("sites", ["indeed", "linkedin", "zip_recruiter"])
    search_term = config.get("searchTerm", "software engineer")
    location = config.get("location", "United States")
    results_wanted = min(config.get("resultsWanted", 20), 100)
    hours_old = config.get("hoursOld", 72)

    log(f"Config: sites={sites}, search='{search_term}', location='{location}', results={results_wanted}, hours={hours_old}")

    try:
        from jobspy import scrape_jobs
    except ImportError:
        log("jobspy not installed")
        emit_result(False, error="jobspy not installed. Run: pip install jobspy")
        return

    try:
        log(f"Scraping {', '.join(sites)}...")
        jobs_df = scrape_jobs(
            site_name=sites,
            search_term=search_term,
            location=location,
            results_wanted=results_wanted,
            hours_old=hours_old,
        )

        if jobs_df is None or jobs_df.empty:
            log("No jobs found")
            emit_result(True, jobs=[], stats={"found": 0})
            return

        log(f"Found {len(jobs_df)} jobs")

        jobs = []
        for _, row in jobs_df.iterrows():
            job = {
                "id": str(row.get("id", "")),
                "title": str(row.get("title", "")),
                "company": str(row.get("company", "")),
                "location": str(row.get("location", "")),
                "url": str(row.get("job_url", "")),
                "description": str(row.get("description", ""))[:5000],
                "date_posted": str(row.get("date_posted", "")),
                "site": str(row.get("site", "")),
            }
            jobs.append(job)

        log(f"Normalized {len(jobs)} jobs")
        emit_result(True, jobs=jobs, stats={"found": len(jobs_df)})

    except Exception as e:
        log(f"Error: {e}")
        emit_result(False, error=str(e))


if __name__ == "__main__":
    main()
