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
import re
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


# ── Normalization helpers ───────────────────────────────────────────────────

# Country name → ISO 3166-1 alpha-2 code
COUNTRY_CODE_MAP = {
    "united states": "US", "usa": "US", "u.s.a.": "US", "u.s.": "US",
    "canada": "CA",
    "united kingdom": "GB", "uk": "GB", "england": "GB", "scotland": "GB", "wales": "GB",
    "germany": "DE", "deutschland": "DE",
    "france": "FR",
    "netherlands": "NL", "holland": "NL",
    "australia": "AU",
    "india": "IN",
    "singapore": "SG",
    "united arab emirates": "AE", "uae": "AE",
    "ireland": "IE",
    "switzerland": "CH",
    "sweden": "SE",
    "poland": "PL",
    "spain": "ES",
    "japan": "JP",
    "south korea": "KR", "korea": "KR",
    "brazil": "BR",
    "south africa": "ZA",
    "new zealand": "NZ",
    "israel": "IL",
    "italy": "IT",
    "mexico": "MX",
    "portugal": "PT",
    "czech republic": "CZ", "czechia": "CZ",
    "denmark": "DK",
    "finland": "FI",
    "norway": "NO",
    "austria": "AT",
    "belgium": "BE",
    "argentina": "AR",
    "chile": "CL",
    "colombia": "CO",
    "china": "CN",
    "hong kong": "HK",
    "taiwan": "TW",
    "thailand": "TH",
    "vietnam": "VN",
    "philippines": "PH",
    "indonesia": "ID",
    "malaysia": "MY",
    "nigeria": "NG",
    "egypt": "EG",
    "saudi arabia": "SA",
    "qatar": "QA",
    "kuwait": "KW",
    "oman": "OM",
    "bahrain": "BH",
    "pakistan": "PK",
    "bangladesh": "BD",
    "romania": "RO",
    "hungary": "HU",
    "greece": "GR",
    "turkey": "TR", "türkiye": "TR",
    "ukraine": "UA",
    "russia": "RU",
    "peru": "PE",
    "ecuador": "EC",
    "uruguay": "UY",
    "venezuela": "VE",
    "costa rica": "CR",
    "panama": "PA",
    "morocco": "MA",
    "luxembourg": "LU",
    "singapore": "SG",
}

# US state abbreviations for parsing location strings
US_STATE_ABBREVS = {
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
    "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
    "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
    "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
    "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
    "DC",
}


def normalize_country_code(raw_country, location_str=""):
    """Convert a country name/code to ISO 3166-1 alpha-2."""
    if not raw_country:
        # Try to infer from location string
        loc_lower = location_str.lower()
        for name, code in COUNTRY_CODE_MAP.items():
            if name in loc_lower:
                return code
        return ""

    code = raw_country.strip()
    # Already a 2-letter code
    if len(code) == 2 and code.isalpha():
        return code.upper()

    # Look up full name
    return COUNTRY_CODE_MAP.get(code.lower(), code.upper()[:2] if len(code) <= 3 else "")


def normalize_employment_type(job_type):
    """Map job board employment type to normalized form."""
    mapping = {
        "fulltime": "full_time",
        "full-time": "full_time",
        "full_time": "full_time",
        "parttime": "part_time",
        "part-time": "part_time",
        "part_time": "part_time",
        "contract": "contract",
        "internship": "internship",
        "temporary": "temporary",
        "contractor": "contract",
        "freelance": "contract",
    }
    return mapping.get(job_type.lower().strip(), "full_time") if job_type else "full_time"


def normalize_salary_period(interval):
    """Map salary interval to normalized form."""
    mapping = {
        "yearly": "year",
        "annual": "year",
        "year": "year",
        "per year": "year",
        "monthly": "month",
        "month": "month",
        "per month": "month",
        "weekly": "week",
        "week": "week",
        "per week": "week",
        "daily": "day",
        "day": "day",
        "per day": "day",
        "hourly": "hour",
        "hour": "hour",
        "per hour": "hour",
    }
    return mapping.get(interval.lower().strip(), "year") if interval else "year"


def normalize_experience_level(job_level):
    """Map job level to normalized experience level."""
    mapping = {
        "entry level": "entry",
        "entry": "entry",
        "junior": "entry",
        "associate": "entry",
        "intern": "entry",
        "internship": "entry",
        "mid level": "mid",
        "mid": "mid",
        "mid-senior": "mid",
        "intermediate": "mid",
        "senior": "senior",
        "senior level": "senior",
        "lead": "lead",
        "principal": "lead",
        "staff": "lead",
        "director": "executive",
        "vp": "executive",
        "c-level": "executive",
        "executive": "executive",
        "manager": "lead",
    }
    return mapping.get(job_level.lower().strip(), "unknown") if job_level else "unknown"


def parse_country_from_location(location_str):
    """Try to extract country from a location string like 'San Francisco, CA, US'."""
    if not location_str:
        return "", ""

    parts = [p.strip() for p in location_str.split(",")]
    if not parts:
        return "", ""

    # Last part might be a country code or name
    last = parts[-1].strip()
    code = normalize_country_code(last, location_str)
    if code:
        return code, last

    # Second-to-last might be a state
    if len(parts) >= 2:
        state_part = parts[-2].strip()
        if state_part.upper() in US_STATE_ABBREVS or len(state_part) == 2:
            return "US", ""  # US state detected → country is US

    return "", ""


def extract_skills_from_description(description, title=""):
    """Extract common skills/technologies from job description text."""
    if not description:
        return []

    # Strip HTML tags for text analysis
    text = re.sub(r"<[^>]+>", " ", description).lower()
    combined = f"{title.lower()} {text}"

    # Common skill patterns (order matters — check specific before general)
    skill_patterns = [
        # Languages
        (r"\bpython\b", "Python"),
        (r"\bjavascript\b", "JavaScript"),
        (r"\btypescript\b", "TypeScript"),
        (r"\bjava\b(?!\s*script)", "Java"),
        (r"\bc\+\+\b", "C++"),
        (r"\bc#\b", "C#"),
        (r"\bgo(lang)?\b", "Go"),
        (r"\brust\b", "Rust"),
        (r"\bruby\b", "Ruby"),
        (r"\bphp\b", "PHP"),
        (r"\bswift\b", "Swift"),
        (r"\bkotlin\b", "Kotlin"),
        (r"\bsql\b", "SQL"),
        (r"\bhtml\b", "HTML"),
        (r"\bcss\b", "CSS"),
        (r"\bsass\b", "Sass"),
        # Frameworks
        (r"\breact\b", "React"),
        (r"\bangular\b", "Angular"),
        (r"\bvue\.?js\b", "Vue.js"),
        (r"\bnext\.?js\b", "Next.js"),
        (r"\bnode\.?js\b", "Node.js"),
        (r"\bexpress\b", "Express"),
        (r"\bdjango\b", "Django"),
        (r"\bflask\b", "Flask"),
        (r"\bfastapi\b", "FastAPI"),
        (r"\bspring boot\b", "Spring Boot"),
        (r"\brails\b", "Ruby on Rails"),
        (r"\blaravel\b", "Laravel"),
        (r"\bflutter\b", "Flutter"),
        (r"\breact native\b", "React Native"),
        # Cloud/DevOps
        (r"\baws\b", "AWS"),
        (r"\bazure\b", "Azure"),
        (r"\bgcp\b", "GCP"),
        (r"\bgoogle cloud\b", "GCP"),
        (r"\bdocker\b", "Docker"),
        (r"\bkubernetes\b", "Kubernetes"),
        (r"\bk8s\b", "Kubernetes"),
        (r"\bterraform\b", "Terraform"),
        (r"\bcicd\b", "CI/CD"),
        (r"\bjenkins\b", "Jenkins"),
        (r"\bgithub actions\b", "GitHub Actions"),
        # Data/AI
        (r"\bmachine learning\b", "Machine Learning"),
        (r"\bml\b", "Machine Learning"),
        (r"\bartificial intelligence\b", "AI"),
        (r"\bai\b", "AI"),
        (r"\bdeep learning\b", "Deep Learning"),
        (r"\bnlp\b", "NLP"),
        (r"\btensorflow\b", "TensorFlow"),
        (r"\bpytorch\b", "PyTorch"),
        (r"\bpandas\b", "Pandas"),
        (r"\bnumpy\b", "NumPy"),
        (r"\bspark\b", "Apache Spark"),
        (r"\bhadoop\b", "Hadoop"),
        (r"\bsql\b", "SQL"),
        (r"\bnosql\b", "NoSQL"),
        (r"\bmongodb\b", "MongoDB"),
        (r"\bpostgresql\b", "PostgreSQL"),
        (r"\bredis\b", "Redis"),
        # Tools
        (r"\bgit\b", "Git"),
        (r"\bjira\b", "Jira"),
        (r"\bconfluence\b", "Confluence"),
        (r"\bslack\b", "Slack"),
        (r"\bfigma\b", "Figma"),
        (r"\bsketch\b", "Sketch"),
        (r"\badobe xd\b", "Adobe XD"),
        # Methodologies
        (r"\bagile\b", "Agile"),
        (r"\bscrum\b", "Scrum"),
        (r"\bkanban\b", "Kanban"),
        (r"\bproduct management\b", "Product Management"),
    ]

    found_skills = set()
    for pattern, skill in skill_patterns:
        if re.search(pattern, combined):
            found_skills.add(skill)

    return sorted(found_skills)[:20]  # Cap at 20 skills


# ── Main ────────────────────────────────────────────────────────────────────

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
            # ── Raw fields from JobSpy ──────────────────────────────────
            raw_site = safe_str(row.get("site", ""))
            raw_title = safe_str(row.get("title", ""))
            raw_company = safe_str(row.get("company", ""))
            raw_company_url = safe_str(row.get("company_url", ""))
            raw_location = safe_str(row.get("location", ""))
            raw_city = safe_str(row.get("city", ""))
            raw_state = safe_str(row.get("state", ""))
            raw_country = safe_str(row.get("country", ""))
            raw_is_remote = bool(row.get("is_remote", False))
            raw_job_url = safe_str(row.get("job_url", ""))
            raw_description = safe_str(row.get("description", ""))
            raw_date_posted = safe_str(row.get("date_posted", ""))
            raw_job_type = safe_str(row.get("job_type", ""))
            raw_interval = safe_str(row.get("interval", ""))
            raw_min_amount = row.get("min_amount")
            raw_max_amount = row.get("max_amount")
            raw_currency = safe_str(row.get("currency", ""))
            raw_emails = safe_str(row.get("emails", ""))
            raw_job_level = safe_str(row.get("job_level", ""))
            raw_company_industry = safe_str(row.get("company_industry", ""))

            # ── Normalize fields ────────────────────────────────────────

            # Country code (ISO 3166-1 alpha-2)
            country_code = normalize_country_code(raw_country, raw_location)
            if not country_code:
                country_code, _ = parse_country_from_location(raw_location)

            # Employment type
            employment_type = normalize_employment_type(raw_job_type)

            # Salary period
            salary_period = normalize_salary_period(raw_interval)

            # Experience level
            experience_level = normalize_experience_level(raw_job_level)

            # Salary amounts (safely convert to numbers)
            try:
                min_amount = float(raw_min_amount) if raw_min_amount is not None else None
            except (ValueError, TypeError):
                min_amount = None
            try:
                max_amount = float(raw_max_amount) if raw_max_amount is not None else None
            except (ValueError, TypeError):
                max_amount = None

            # Skills extraction
            skills = extract_skills_from_description(raw_description, raw_title)

            # Build canonical job_url
            job_url = raw_job_url

            # ── Output ──────────────────────────────────────────────────
            job = {
                "id": job_url,
                "site": raw_site,
                "title": raw_title,
                "company": raw_company,
                "company_url": raw_company_url,
                "location": raw_location,
                "city": raw_city,
                "state": raw_state,
                "country": country_code,
                "is_remote": raw_is_remote,
                "job_url": job_url,
                "description": raw_description[:5000],
                "date_posted": raw_date_posted,
                "job_type": employment_type,
                "interval": salary_period,
                "min_amount": min_amount,
                "max_amount": max_amount,
                "currency": raw_currency or "USD",
                "salary_source": safe_str(row.get("salary_source", "")),
                "emails": raw_emails,
                "job_level": experience_level,
                "company_industry": raw_company_industry,
                "skills": skills,
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
