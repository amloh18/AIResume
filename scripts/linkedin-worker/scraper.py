"""
LinkedIn Scraper

Uses Playwright to discover jobs on LinkedIn.
Two-stage approach:
  1. Discovery: collect job IDs, titles, companies, locations, URLs
  2. Enrichment: fetch full descriptions for new/changed jobs only

Requires a persistent browser profile with an authenticated LinkedIn session.
"""

import sys
import os
import json
import random
import time
from datetime import datetime, timezone
from typing import Optional

from normalizer import normalize_linkedin_job, clean_text


def log(msg):
    print(f"[LinkedIn Scraper] {msg}", file=sys.stderr)


class LinkedInAuthState:
    """Authentication state detection."""
    AUTHENTICATED = "AUTHENTICATED"
    AUTH_REQUIRED = "AUTH_REQUIRED"
    BLOCKED = "BLOCKED"
    CHALLENGE = "CHALLENGE"
    UNKNOWN = "UNKNOWN"


class LinkedInScraper:
    def __init__(self, config):
        self.config = config
        self.browser = None
        self.context = None
        self._page = None

    async def start(self):
        """Launch browser with persistent profile."""
        from playwright.async_api import async_playwright

        self._playwright = await async_playwright().start()

        profile_dir = self.config.browser_profile_dir
        os.makedirs(profile_dir, mode=0o700, exist_ok=True)

        log(f"Launching browser with profile: {profile_dir}")

        self.context = await self._playwright.chromium.launch_persistent_context(
            user_data_dir=profile_dir,
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-blink-features=AutomationControlled",
                "--disable-dev-shm-usage",
            ],
            viewport={"width": 1366, "height": 768},
            user_agent="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            locale="en-US",
            timezone_id="America/New_York",
        )

        # Inject stealth scripts to reduce detection
        await self.context.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
            Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
            window.chrome = { runtime: {} };
        """)

        self._page = await self.context.new_page()
        log("Browser launched successfully")

    async def stop(self):
        """Clean up browser resources."""
        try:
            if self._page:
                await self._page.close()
            if self.context:
                await self.context.close()
            if self._playwright:
                await self._playwright.stop()
        except Exception as e:
            log(f"Warning during cleanup: {e}")

    async def check_session(self) -> str:
        """
        Check if the browser session is authenticated.
        Returns one of: AUTHENTICATED, AUTH_REQUIRED, BLOCKED, CHALLENGE, UNKNOWN
        """
        try:
            page = self._page or (await self.context.new_page())
            await page.goto("https://www.linkedin.com/feed/", wait_until="domcontentloaded", timeout=30000)
            await self._human_delay(3, 5)

            # Check for auth wall
            content = await page.content()
            url = page.url

            if "authwall" in url or "login" in url:
                log("Session not authenticated — auth wall detected")
                return LinkedInAuthState.AUTH_REQUIRED

            if "checkpoint" in url or "challenge" in url:
                log("LinkedIn checkpoint/challenge detected")
                return LinkedInAuthState.CHALLENGE

            if "access" in url and "denied" in content.lower():
                log("Access denied detected")
                return LinkedInAuthState.BLOCKED

            # Check for authenticated indicators
            authenticated_indicators = [
                "global-nav",
                "feed-identity-module",
                "scaffold-layout",
                "discover-body",
            ]

            for indicator in authenticated_indicators:
                if indicator in content:
                    log("Session is AUTHENTICATED")
                    return LinkedInAuthState.AUTHENTICATED

            # If we're on the feed page without auth wall, assume authenticated
            if "/feed" in url and "authwall" not in url:
                log("Session appears authenticated (on /feed)")
                return LinkedInAuthState.AUTHENTICATED

            log(f"Session state UNKNOWN (url={url})")
            return LinkedInAuthState.UNKNOWN

        except Exception as e:
            log(f"Session check failed: {e}")
            return LinkedInAuthState.UNKNOWN

    async def discover_jobs(self, keyword: str, location: str, remote: bool = False,
                            posted_within_hours: int = 168, max_pages: int = 2,
                            max_jobs: int = 100) -> list:
        """
        Stage 1: Discovery — collect job IDs, titles, companies, locations, URLs.
        Returns list of raw LinkedIn job dicts.
        """
        jobs = []
        page = self._page

        if not page:
            log("No page available — call start() first")
            return jobs

        # Build LinkedIn job search URL
        search_url = self._build_search_url(keyword, location, remote, posted_within_hours)
        log(f"Searching: {keyword} in {location} (remote={remote})")
        log(f"URL: {search_url}")

        for page_num in range(1, max_pages + 1):
            if len(jobs) >= max_jobs:
                log(f"Reached max jobs limit ({max_jobs})")
                break

            page_url = f"{search_url}&start={25 * (page_num - 1)}"
            log(f"Fetching page {page_num}/{max_pages}: {page_url}")

            try:
                await page.goto(page_url, wait_until="domcontentloaded", timeout=30000)
                await self._human_delay(3, 6)

                # Check for blocking
                block_status = await self._check_for_blocking(page)
                if block_status != LinkedInAuthState.AUTHENTICATED:
                    log(f"Blocking detected during search: {block_status}")
                    return jobs

                # Parse job cards
                page_jobs = await self._parse_job_cards(page, keyword)
                log(f"Page {page_num}: found {len(page_jobs)} jobs")

                if not page_jobs:
                    log("No jobs found on page — stopping pagination")
                    break

                jobs.extend(page_jobs)

                # Human-like delay between pages
                if page_num < max_pages:
                    await self._human_delay(5, 10)

            except Exception as e:
                log(f"Error on page {page_num}: {e}")
                break

        log(f"Discovery complete: {len(jobs)} jobs found")
        return jobs[:max_jobs]

    async def enrich_job(self, job_url: str) -> Optional[str]:
        """
        Stage 2: Enrichment — fetch full job description from job page.
        Returns HTML description or None.
        """
        page = self._page
        if not page or not job_url:
            return None

        try:
            await page.goto(job_url, wait_until="domcontentloaded", timeout=20000)
            await self._human_delay(2, 4)

            # Extract description
            description = await page.evaluate("""
                () => {
                    const descEl = document.querySelector('.description__text, .show-more-less-html__markup, .decorated-job-searchable-entity__description');
                    return descEl ? descEl.innerHTML : '';
                }
            """)

            return description if description else None

        except Exception as e:
            log(f"Error enriching job: {e}")
            return None

    def _build_search_url(self, keyword: str, location: str, remote: bool,
                          posted_within_hours: int) -> str:
        """Build LinkedIn job search URL with filters."""
        import urllib.parse

        params = {
            "keywords": keyword,
            "location": location,
            "f_TPR": f"r{posted_within_hours * 3600}",  # LinkedIn uses seconds
            "sortBy": "DD",  # Date descending
        }

        if remote:
            params["f_WT"] = "2"  # Remote filter

        query = urllib.parse.urlencode(params)
        return f"https://www.linkedin.com/jobs/search/?{query}"

    async def _parse_job_cards(self, page, keyword: str) -> list:
        """Parse job cards from the current search results page."""
        jobs = []

        try:
            # Wait for job cards to load
            await page.wait_for_selector(
                ".jobs-search-results__list-item, li.scaffold-layout__list-item",
                timeout=10000,
            )

            # Extract job data using JavaScript
            raw_jobs = await page.evaluate("""
                () => {
                    const cards = document.querySelectorAll(
                        '.jobs-search-results__list-item, li.scaffold-layout__list-item'
                    );
                    return Array.from(cards).map(card => {
                        const titleEl = card.querySelector(
                            '.job-card-list__title--link, .artdeco-entity-lockup__title a, a[data-tracking-control-name="public_jobs_jserp-result"]'
                        );
                        const companyEl = card.querySelector(
                            '.artdeco-entity-lockup__subtitle, .job-card-container__primary-description'
                        );
                        const locationEl = card.querySelector(
                            '.artdeco-entity-lockup__caption, .job-card-container__metadata-item'
                        );
                        const linkEl = card.querySelector('a[href*="/jobs/view/"]');

                        const jobId = card.getAttribute('data-occludable-job-id')
                            || card.getAttribute('data-job-id')
                            || '';

                        return {
                            title: titleEl ? titleEl.textContent.trim() : '',
                            company: companyEl ? companyEl.textContent.trim() : '',
                            location: locationEl ? locationEl.textContent.trim() : '',
                            url: linkEl ? linkEl.href : '',
                            id: jobId,
                        };
                    }).filter(j => j.title || j.url);
                }
            """)

            for raw_job in raw_jobs:
                raw_job["search_keyword"] = keyword
                normalized = normalize_linkedin_job(raw_job)
                jobs.append(normalized)

        except Exception as e:
            log(f"Error parsing job cards: {e}")

        return jobs

    async def _check_for_blocking(self, page) -> str:
        """Check if LinkedIn is blocking access."""
        try:
            url = page.url
            content = await page.content()

            if "authwall" in url or "login" in url:
                return LinkedInAuthState.AUTH_REQUIRED
            if "checkpoint" in url or "challenge" in url:
                return LinkedInAuthState.CHALLENGE
            if "access" in url and "denied" in content.lower():
                return LinkedInAuthState.BLOCKED
            if "unusual" in content.lower() and "verify" in content.lower():
                return LinkedInAuthState.CHALLENGE

            return LinkedInAuthState.AUTHENTICATED
        except:
            return LinkedInAuthState.UNKNOWN

    async def _human_delay(self, min_seconds: float, max_seconds: float):
        """Add human-like delay."""
        delay = random.uniform(min_seconds, max_seconds)
        await asyncio.sleep(delay)


import asyncio
