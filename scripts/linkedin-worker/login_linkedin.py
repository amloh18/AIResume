"""
LinkedIn Login Helper

Interactive script to authenticate a LinkedIn session in the persistent browser profile.
Run this ONCE on the VPS to create the authenticated session.

Usage:
    python3 scripts/linkedin-worker/login_linkedin.py

This will open a browser window where you can manually log in to LinkedIn.
After logging in, press ENTER to save the session and close the browser.

The session will be stored in the persistent browser profile directory
and reused by the worker for subsequent runs.

Security:
  - No credentials are stored in code
  - No credentials are sent anywhere
  - Session is stored only in the local browser profile
  - Profile directory has restrictive permissions (0700)
"""

import os
import sys
import asyncio

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from config import LinkedInConfig


async def main():
    config = LinkedInConfig()

    if not config.enabled:
        print("ERROR: LinkedIn worker is disabled.")
        print("Set LINKEDIN_ENABLED=true in your environment first.")
        sys.exit(1)

    print("=" * 60)
    print("LinkedIn Login Helper")
    print("=" * 60)
    print()
    print(f"Browser profile directory: {config.browser_profile_dir}")
    print()
    print("This will open a browser window for you to log in to LinkedIn.")
    print("After logging in, press ENTER in this terminal to save and close.")
    print()

    try:
        from playwright.async_api import async_playwright
    except ImportError:
        print("ERROR: Playwright is not installed.")
        print("Run: pip install playwright && playwright install chromium")
        sys.exit(1)

    os.makedirs(config.browser_profile_dir, mode=0o700, exist_ok=True)

    async with async_playwright() as p:
        context = await p.chromium.launch_persistent_context(
            user_data_dir=config.browser_profile_dir,
            headless=False,  # Must be visible for manual login
            args=[
                "--no-sandbox",
                "--disable-blink-features=AutomationControlled",
            ],
            viewport={"width": 1366, "height": 768},
            locale="en-US",
        )

        page = context.pages[0] if context.pages else await context.new_page()

        await page.goto("https://www.linkedin.com/login")
        print()
        print("Browser opened. Please log in to LinkedIn.")
        print("After logging in, come back here and press ENTER.")
        print()

        input("Press ENTER after logging in...")

        # Verify we're logged in
        await page.goto("https://www.linkedin.com/feed/", wait_until="domcontentloaded")
        url = page.url

        if "authwall" in url or "login" in url:
            print()
            print("WARNING: It doesn't look like you're logged in.")
            print("The browser will close anyway. Run this script again to retry.")
        else:
            print()
            print("Login appears successful!")
            print(f"Session saved to: {config.browser_profile_dir}")

        await context.close()

    print()
    print("Done. You can now run the LinkedIn worker.")


if __name__ == "__main__":
    asyncio.run(main())
