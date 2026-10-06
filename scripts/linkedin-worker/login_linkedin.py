"""
LinkedIn Login Helper

Interactive script to authenticate a LinkedIn session in the persistent browser profile.
Run this ONCE on the VPS to create the authenticated session.

Usage:
    python3 scripts/linkedin-worker/login_linkedin.py           # auto-detect display
    python3 scripts/linkedin-worker/login_linkedin.py --xvfb    # force Xvfb (headless VPS)
    python3 scripts/linkedin-worker/login_linkedin.py --headless # headless with cookie import

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
import shutil
import subprocess
import argparse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from config import LinkedInConfig


def has_display():
    """Check if a graphical display is available."""
    return bool(os.environ.get("DISPLAY") or os.environ.get("WAYLAND_DISPLAY"))


def try_start_xvfb():
    """Try to start Xvfb for headless VPS environments. Returns True if started."""
    if has_display():
        return True  # Already have a display

    if not shutil.which("Xvfb"):
        # Try to install Xvfb
        print("[*] No display found. Attempting to install Xvfb...")
        for cmd in [
            ["apt-get", "update", "-qq"],
            ["apt-get", "install", "-y", "-qq", "xvfb"],
        ]:
            try:
                subprocess.run(cmd, check=False, capture_output=True, timeout=60)
            except (subprocess.TimeoutExpired, FileNotFoundError):
                pass

        if not shutil.which("Xvfb"):
            print("WARNING: Xvfb not available. Cannot open visible browser.")
            print("Options:")
            print("  1. Install Xvfb: sudo apt-get install xvfb")
            print("  2. Run with --headless flag (requires manual cookie setup)")
            print("  3. Run login_linkedin.py on a machine with a display, then copy the profile")
            return False

    # Start Xvfb on display :99
    display_num = ":99"
    try:
        # Kill any existing Xvfb on this display
        subprocess.run(["pkill", "-f", f"Xvfb {display_num}"], capture_output=True, timeout=5)
    except Exception:
        pass

    try:
        xvfb_proc = subprocess.Popen(
            ["Xvfb", display_num, "-screen", "0", "1366x768x24", "-ac"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        os.environ["DISPLAY"] = display_num
        # Give Xvfb a moment to start
        import time
        time.sleep(1)
        print(f"[+] Started Xvfb on display {display_num} (PID: {vxserv_proc.pid if hasattr(locals(), 'xvfb_proc') else xvfb_proc.pid})")
        return True
    except Exception as e:
        print(f"WARNING: Failed to start Xvfb: {e}")
        return False


async def interactive_login(config):
    """Standard interactive login with visible browser."""
    try:
        from playwright.async_api import async_playwright
    except ImportError:
        print("ERROR: Playwright is not installed.")
        print("Run: pip install playwright && playwright install chromium")
        sys.exit(1)

    os.makedirs(config.browser_profile_dir, mode=0o700, exist_ok=True)

    print("=" * 60)
    print("LinkedIn Login Helper")
    print("=" * 60)
    print()
    print(f"Browser profile directory: {config.browser_profile_dir}")
    print()
    print("This will open a browser window for you to log in to LinkedIn.")
    print("After logging in, press ENTER in this terminal to save and close.")
    print()

    async with async_playwright() as p:
        context = await p.chromium.launch_persistent_context(
            user_data_dir=config.browser_profile_dir,
            headless=False,
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


async def headless_cookie_import(config):
    """
    Headless mode: opens LinkedIn login page, waits for user to provide cookies.
    This is for environments without a display.
    
    Alternative: export cookies from a browser on another machine and import them here.
    """
    try:
        from playwright.async_api import async_playwright
    except ImportError:
        print("ERROR: Playwright is not installed.")
        print("Run: pip install playwright && playwright install chromium")
        sys.exit(1)

    os.makedirs(config.browser_profile_dir, mode=0o700, exist_ok=True)

    print("=" * 60)
    print("LinkedIn Headless Login")
    print("=" * 60)
    print()
    print("This mode creates a browser profile without a visible window.")
    print()
    print("Options:")
    print("  1. Export cookies from your browser (using a browser extension)")
    print("     and save them to /tmp/linkedin-cookies.json")
    print("  2. Use the --xvfb flag instead for a visible window on headless VPS")
    print()

    cookies_file = "/tmp/linkedin-cookies.json"
    if os.path.exists(cookies_file):
        print(f"[*] Found cookies file: {cookies_file}")
        import json
        with open(cookies_file, "r") as f:
            cookies = json.load(f)

        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True, args=["--no-sandbox"])
            context = await browser.new_context()

            # Import cookies
            linkedin_cookies = [
                c for c in cookies
                if "linkedin.com" in c.get("domain", "")
            ]
            if linkedin_cookies:
                await context.add_cookies(linkedin_cookies)
                print(f"[+] Imported {len(linkedin_cookies)} LinkedIn cookies")
            else:
                print("[-] No LinkedIn cookies found in the file")
                await browser.close()
                return

            page = await context.new_page()
            await page.goto("https://www.linkedin.com/feed/", wait_until="domcontentloaded")

            url = page.url
            if "authwall" in url or "login" in url:
                print("[-] Cookies appear invalid or expired. Please export fresh cookies.")
                await browser.close()
                return

            print("[+] Login successful via cookies!")

            # Save the session by launching a persistent context with the same data
            await browser.close()

            # Re-launch as persistent context to save the profile
            pw = await async_playwright().start()
            persistent = await pw.chromium.launch_persistent_context(
                user_data_dir=config.browser_profile_dir,
                headless=True,
                args=["--no-sandbox"],
            )
            persistent_page = persistent.pages[0] if persistent.pages else await persistent.new_page()

            # Import cookies into persistent context
            await persistent.add_cookies(linkedin_cookies)
            await persistent_page.goto("https://www.linkedin.com/feed/", wait_until="domcontentloaded")

            print(f"[+] Session saved to: {config.browser_profile_dir}")
            await persistent.close()
            await pw.stop()
    else:
        print(f"[!] No cookies file found at {cookies_file}")
        print()
        print("To use headless mode:")
        print("  1. Install a cookie export extension in your browser")
        print("  2. Log in to LinkedIn in your browser")
        print("  3. Export cookies as JSON to: /tmp/linkedin-cookies.json")
        print("  4. Re-run this script")
        print()
        print("Or use --xvfb flag for a visible browser window on headless VPS:")
        print("  python3 login_linkedin.py --xvfb")


async def main():
    parser = argparse.ArgumentParser(description="LinkedIn Login Helper")
    parser.add_argument("--xvfb", action="store_true", help="Force Xvfb display (for headless VPS)")
    parser.add_argument("--headless", action="store_true", help="Headless cookie import mode")
    args = parser.parse_args()

    config = LinkedInConfig()

    if not config.enabled:
        print("ERROR: LinkedIn worker is disabled.")
        print("Set LINKEDIN_ENABLED=true in your environment first.")
        sys.exit(1)

    # Ensure profile directory exists
    os.makedirs(config.browser_profile_dir, mode=0o700, exist_ok=True)
    print(f"[+] Browser profile directory: {config.browser_profile_dir}")

    if args.headless:
        await headless_cookie_import(config)
    elif args.xvfb or not has_display():
        if not has_display():
            print("[*] No display detected. Attempting Xvfb...")
            if not try_start_xvfb():
                print()
                print("Falling back to headless cookie import mode...")
                await headless_cookie_import(config)
                return
        await interactive_login(config)
    else:
        await interactive_login(config)


if __name__ == "__main__":
    asyncio.run(main())
