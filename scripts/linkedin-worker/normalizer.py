"""
LinkedIn Job Normalizer

Converts raw LinkedIn job data to the normalized format expected by
the BuildAIResume ingestion API (RawJob format).
"""

import re
from datetime import datetime, timezone


def normalize_linkedin_job(raw_job: dict) -> dict:
    """
    Normalize a raw LinkedIn job into the RawJob format used by
    the BuildAIResume ingestion engine.

    RawJob fields:
        source, sourceJobId, url, title, companyName,
        rawHtmlDescription, locationString, isRemote,
        postedDate, applicationUrl, department, category, sourceMetadata
    """
    title = clean_text(raw_job.get("title", ""))
    company = clean_text(raw_job.get("company", ""))
    location = clean_text(raw_job.get("location", ""))
    description = raw_job.get("description", "")
    url = raw_job.get("url", "")
    linkedin_id = raw_job.get("id") or raw_job.get("linkedin_job_id") or ""

    # Extract job ID from URL if not provided
    if not linkedin_id and url:
        match = re.search(r"/view/[^/]*-(\d+)", url)
        if match:
            linkedin_id = match.group(1)

    # Build canonical LinkedIn URL
    if linkedin_id and not url:
        url = f"https://www.linkedin.com/jobs/view/{linkedin_id}"

    # Detect remote
    is_remote = detect_remote(location, description)

    # Parse posted date
    posted_date = parse_date(raw_job.get("posted_date") or raw_job.get("date_posted"))

    # Detect employment type
    employment_type = detect_employment_type(title, description)

    # Detect experience level
    experience_level = detect_experience_level(title)

    return {
        "source": "linkedin",
        "sourceJobId": str(linkedin_id) if linkedin_id else f"li-{hash_url(url)}",
        "url": url,
        "title": title,
        "companyName": company,
        "rawHtmlDescription": description,
        "locationString": location,
        "isRemote": is_remote,
        "postedDate": posted_date,
        "applicationUrl": raw_job.get("apply_url") or url,
        "department": raw_job.get("department"),
        "category": raw_job.get("category"),
        "sourceMetadata": {
            "linkedin_job_id": linkedin_id,
            "search_keyword": raw_job.get("search_keyword"),
            "scraped_at": datetime.now(timezone.utc).isoformat(),
            "experience_level": experience_level,
            "employment_type": employment_type,
        },
    }


def clean_text(text: str) -> str:
    """Remove extra whitespace and HTML artifacts."""
    if not text:
        return ""
    text = re.sub(r"<[^>]+>", "", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def detect_remote(location: str, description: str) -> bool:
    """Detect if a job is remote."""
    combined = f"{location} {description}".lower()
    remote_signals = [
        "remote",
        "work from home",
        "wfh",
        "telecommute",
        "distributed",
        "anywhere",
        "fully remote",
        "100% remote",
    ]
    return any(signal in combined for signal in remote_signals)


def parse_date(date_str: str) -> str:
    """Parse various date formats to ISO string."""
    if not date_str:
        return datetime.now(timezone.utc).isoformat()

    # Already ISO format
    if "T" in str(date_str):
        return str(date_str)

    # Try common formats
    formats = [
        "%Y-%m-%d",
        "%Y-%m-%dT%H:%M:%S",
        "%B %d, %Y",
        "%b %d, %Y",
        "%m/%d/%Y",
        "%d/%m/%Y",
    ]

    for fmt in formats:
        try:
            dt = datetime.strptime(str(date_str), fmt)
            return dt.replace(tzinfo=timezone.utc).isoformat()
        except ValueError:
            continue

    return datetime.now(timezone.utc).isoformat()


def detect_employment_type(title: str, description: str) -> str:
    """Detect employment type from title and description."""
    combined = f"{title} {description}".lower()

    if any(w in combined for w in ["contract", "contractor", "freelance", "consultant"]):
        return "contract"
    if any(w in combined for w in ["part-time", "part time", "parttime"]):
        return "part_time"
    if any(w in combined for w in ["intern", "internship", "co-op"]):
        return "internship"
    if any(w in combined for w in ["temporary", "temp"]):
        return "temporary"

    return "full_time"


def detect_experience_level(title: str) -> str:
    """Detect experience level from title."""
    lower = title.lower()

    if any(w in lower for w in ["senior", "sr.", "sr "]):
        return "senior"
    if any(w in lower for w in ["staff", "principal"]):
        return "staff"
    if any(w in lower for w in ["junior", "jr.", "jr "]):
        return "junior"
    if any(w in lower for w in ["lead", "head of"]):
        return "lead"
    if any(w in lower for w in ["intern"]):
        return "intern"
    if any(w in lower for w in ["director", "vp", "vice president", "c-level", "cto", "ceo"]):
        return "executive"

    return "mid"


def hash_url(url: str) -> str:
    """Generate a short hash for a URL."""
    import hashlib
    return hashlib.md5(url.encode()).hexdigest()[:12]
