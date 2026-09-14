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
  "hoursOld": 72,
  "countryIndeed": "USA",
  "isRemote": false,
  "jobType": "fulltime",
  "proxies": ["user:pass@host:port"]
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


def safe_str(val, default=""):
    """Safely convert a value to string, handling NaN/None."""
    if val is None:
        return default
    try:
        import math
        if isinstance(val, float) and math.isnan(val):
            return default
    except (ImportError, TypeError):
        pass
    return str(val).strip() if str(val).strip() else default


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
    country_indeed = config.get("countryIndeed", "USA")
    is_remote = config.get("isRemote", None)
    job_type = config.get("jobType", None)
    proxies = config.get("proxies", None)
    linkedin_fetch_description = config.get("linkedinFetchDescription", False)
    linkedin_company_ids = config.get("linkedinCompanyIds", None)
    enforce_annual_salary = config.get("enforceAnnualSalary", True)

    log(f"Config: sites={sites}, search='{search_term}', location='{location}', results={results_wanted}, hours={hours_old}")

    try:
        from jobspy import scrape_jobs
    except ImportError:
        log("jobspy not installed")
        emit_result(False, error="jobspy not installed. Run: pip install python-jobspy")
        return

    try:
        log(f"Scraping {', '.join(sites)}...")

        scrape_kwargs = {
            "site_name": sites,
            "search_term": search_term,
            "location": location,
            "results_wanted": results_wanted,
            "hours_old": hours_old,
            "verbose": 1,
            "description_format": "html",
            "enforce_annual_salary": enforce_annual_salary,
        }

        # Optional params
        if country_indeed:
            scrape_kwargs["country_indeed"] = country_indeed
        if is_remote is not None:
            scrape_kwargs["is_remote"] = is_remote
        if job_type:
            scrape_kwargs["job_type"] = job_type
        if proxies:
            scrape_kwargs["proxies"] = proxies
        if linkedin_fetch_description:
            scrape_kwargs["linkedin_fetch_description"] = linkedin_fetch_description
        if linkedin_company_ids:
            scrape_kwargs["linkedin_company_ids"] = linkedin_company_ids

        jobs_df = scrape_jobs(**scrape_kwargs)

        if jobs_df is None or jobs_df.empty:
            log("No jobs found")
            emit_result(True, jobs=[], stats={"found": 0})
            return

        log(f"Found {len(jobs_df)} jobs")

        jobs = []
        for _, row in jobs_df.iterrows():
            # Build job_url from available fields
            job_url = safe_str(row.get("job_url", ""))

            # Build location string from city/state or full location
            city = safe_str(row.get("city", ""))
            state = safe_str(row.get("state", ""))
            location_str = safe_str(row.get("location", ""))
            if not location_str and (city or state):
                parts = [p for p in [city, state] if p]
                location_str = ", ".join(parts)

            # Salary fields
            interval = safe_str(row.get("interval", ""))
            min_amount = row.get("min_amount")
            max_amount = row.get("max_amount")
            currency = safe_str(row.get("currency", ""))
            salary_source = safe_str(row.get("salary_source", ""))

            # Convert salary to numbers safely
            try:
                min_amount = float(min_amount) if min_amount is not None else None
            except (ValueError, TypeError):
                min_amount = None
            try:
                max_amount = float(max_amount) if max_amount is not None else None
            except (ValueError, TypeError):
                max_amount = None

            job = {
                "id": job_url,  # Use job_url as the primary ID for deduplication
                "site": safe_str(row.get("site", "")),
                "title": safe_str(row.get("title", "")),
                "company": safe_str(row.get("company", "")),
                "company_url": safe_str(row.get("company_url", "")),
                "location": location_str,
                "city": city,
                "state": state,
                "country": safe_str(row.get("country", "")),
                "is_remote": bool(row.get("is_remote", False)),
                "job_url": job_url,
                "description": safe_str(row.get("description", ""))[:5000],
                "date_posted": safe_str(row.get("date_posted", "")),
                "job_type": safe_str(row.get("job_type", "")),
                "interval": interval,
                "min_amount": min_amount,
                "max_amount": max_amount,
                "currency": currency,
                "salary_source": salary_source,
                "emails": safe_str(row.get("emails", "")),
                "job_level": safe_str(row.get("job_level", "")),
                "company_industry": safe_str(row.get("company_industry", "")),
            }
            jobs.append(job)

        log(f"Normalized {len(jobs)} jobs")
        emit_result(True, jobs=jobs, stats={"found": len(jobs_df)})

    except Exception as e:
        log(f"Error: {e}")
        import traceback
        traceback.print_exc(file=sys.stderr)
        emit_result(False, error=str(e))


if __name__ == "__main__":
    main()
