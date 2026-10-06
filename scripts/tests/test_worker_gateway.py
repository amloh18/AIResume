"""
Tests for scripts/worker-gateway.py.

Run:  python3 scripts/tests/test_worker_gateway.py

The gateway is the transport that lets the Python workers move off the application image, so the two
things worth pinning down are the ones the app actually depends on:

  1. `env` from the request reaches the subprocess, layered over the service environment. The LinkedIn
     worker's settings live in the database, not on the VPS, so they must travel with each request or
     the worker silently falls back to its own defaults.
  2. A worker that hangs is killed and reported as 504 rather than hanging the request forever.

Both are exercised through `run_worker` with a stub script, so the tests do not need Playwright, JobSpy
or a browser.
"""

import importlib.util
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

GATEWAY_PATH = Path(__file__).resolve().parent.parent / "worker-gateway.py"


def load_gateway():
    spec = importlib.util.spec_from_file_location("worker_gateway", GATEWAY_PATH)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


PROBE_SOURCE = """
import json
import os
import sys

sys.stdin.read()
print(json.dumps({
    "success": True,
    "jobs": [],
    "stats": {},
    "seen": {k: v for k, v in os.environ.items() if k.startswith("PROBE_")},
}))
"""

SLEEP_SOURCE = """
import sys
import time

sys.stdin.read()
time.sleep(30)
print('{"success": true, "jobs": [], "stats": {}}')
"""


def main():
    gw = load_gateway()
    results = []

    def check(name, ok, detail=""):
        results.append((name, ok, detail))

    with tempfile.TemporaryDirectory() as tmp:
        tmpdir = Path(tmp)

        probe = tmpdir / "probe.py"
        probe.write_text(PROBE_SOURCE)

        sleeper = tmpdir / "sleeper.py"
        sleeper.write_text(SLEEP_SOURCE)

        # Stub workers registered on the module so we exercise the real run_worker path without needing
        # Playwright or JobSpy installed.
        gw.WORKERS["probe"] = {"script": probe, "venv": tmpdir / "no-such-venv"}
        gw.WORKERS["sleeper"] = {"script": sleeper, "venv": tmpdir / "no-such-venv"}

        # ── 1. env passthrough ──────────────────────────────────────────────
        os.environ["PROBE_FROM_SERVICE"] = "inherited"
        status, result = gw.run_worker(
            "probe",
            {"anything": 1},
            {"PROBE_FROM_REQUEST": "forwarded", "PROBE_LINKEDIN_DEFAULT_KEYWORD": "data engineer"},
        )

        check("env: run_worker returns 200", status == 200, "status=%s" % status)
        check("env: worker reported success", result.get("success") is True, json.dumps(result)[:160])

        seen = result.get("seen") or {}
        check(
            "env: request-supplied var reaches the subprocess",
            seen.get("PROBE_FROM_REQUEST") == "forwarded",
            "seen=%s" % json.dumps(seen),
        )
        check(
            "env: DB-derived LinkedIn setting reaches the subprocess",
            seen.get("PROBE_LINKEDIN_DEFAULT_KEYWORD") == "data engineer",
            "seen=%s" % json.dumps(seen),
        )
        check(
            "env: service environment is still inherited",
            seen.get("PROBE_FROM_SERVICE") == "inherited",
            "seen=%s" % json.dumps(seen),
        )

        # ── 2. numeric values are coerced to strings ────────────────────────
        status, result = gw.run_worker("probe", {}, {"PROBE_NUMERIC": 5})
        check(
            "env: non-string values are coerced, not rejected",
            (result.get("seen") or {}).get("PROBE_NUMERIC") == "5",
            "seen=%s" % json.dumps(result.get("seen")),
        )

        # ── 3. no env at all still works ────────────────────────────────────
        status, result = gw.run_worker("probe", {}, None)
        check("env: omitted env is accepted", status == 200 and result.get("success") is True, "status=%s" % status)

        # ── 4. missing script is reported, not raised ───────────────────────
        gw.WORKERS["missing"] = {"script": tmpdir / "nope.py", "venv": tmpdir / "no-such-venv"}
        status, result = gw.run_worker("missing", {}, None)
        check("missing script -> 500 with a clear error", status == 500 and "not found" in (result.get("error") or ""),
              "status=%s error=%s" % (status, result.get("error")))

        # ── 5. a hanging worker is killed and reported as 504 ───────────────
        gw.TIMEOUT_SECONDS = 2
        status, result = gw.run_worker("sleeper", {}, None)
        check("timeout -> 504", status == 504, "status=%s" % status)
        check("timeout reports the limit", "exceeded" in (result.get("error") or ""), "error=%s" % result.get("error"))

        # ── 6. a worker that prints no JSON is reported as 502 ──────────────
        silent = tmpdir / "silent.py"
        silent.write_text("import sys\nsys.stdin.read()\n")
        gw.WORKERS["silent"] = {"script": silent, "venv": tmpdir / "no-such-venv"}
        status, result = gw.run_worker("silent", {}, None)
        check("no JSON on stdout -> 502", status == 502, "status=%s" % status)

    # ── 7. the real workers are registered under the names the app sends ─────
    real = load_gateway()
    check(
        "real gateway registers jobspy and linkedin",
        sorted(real.WORKERS) == ["jobspy", "linkedin"],
        "keys=%s" % sorted(real.WORKERS),
    )
    check(
        "real worker scripts resolve to existing files",
        all(spec["script"].is_file() for spec in real.WORKERS.values()),
        "paths=%s" % [str(s["script"]) for s in real.WORKERS.values()],
    )

    # ── 8. `env` is threaded through the HTTP handler ───────────────────────
    source = GATEWAY_PATH.read_text()
    check(
        "handler forwards request env to run_worker",
        'run_worker(name, payload, extra_env)' in source,
        "",
    )
    check(
        "handler validates that env is an object",
        'env must be an object' in source,
        "",
    )

    failed = 0
    for name, ok, detail in results:
        if not ok:
            failed += 1
        print("%s  %s%s" % ("PASS" if ok else "FAIL", name, "  [%s]" % detail if detail else ""))

    print("\n%d/%d passed" % (len(results) - failed, len(results)))
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
