"""
Worker Gateway — HTTP front end for the Python ingestion workers.

WHY THIS EXISTS
---------------
`scripts/jobspy-worker.py` and `scripts/linkedin-worker/worker.py` are one-shot processes: JSON on
stdin, JSON on stdout, logs on stderr, then exit. The Next.js app currently spawns them directly
(`src/lib/ingestion/engine.ts`), which forces Python, Playwright and JobSpy into the application Docker
image — so any deploy that misses a layer cache re-downloads Chromium and the JobSpy dependency tree.

This gateway moves the *process boundary* to the VPS without changing the workers. It accepts the same
JSON payload the app used to write to stdin, runs the same script the same way, and returns the same JSON
the app used to read from stdout. Neither worker file is modified, which is precisely what makes the
migration reversible: clear INGESTION_WORKER_URL in the app and the local `spawn()` path resumes
byte-for-byte.

PROTOCOL
--------
  GET  /live
    -> 200 { status, version }
       Unauthenticated and detail-free, so a connectivity check can confirm something is listening.

  GET  /health
    Headers: Authorization: Bearer <WORKER_GATEWAY_TOKEN>   (required when the token is set)
    -> 200 {
         status, version, projectDir, timeoutSeconds, authenticated,
         workers: { jobspy: {script, scriptPresent, python, venvPresent, busy}, linkedin: {...} }
       }
       Token-gated because it exposes filesystem layout and worker state, and the gateway is reachable
       by anything on the Docker network.

  POST /scrape
    Headers: Authorization: Bearer <WORKER_GATEWAY_TOKEN>   (required when the token is set)
    Body:    {
               "worker":  "jobspy" | "linkedin",
               "payload": { ...the same JSON as stdin... },
               "env":     { ...optional per-run env for the subprocess... }
             }
    -> 200 { success, jobs, stats, error?, logs, durationMs, exitCode }
       non-200 on transport failure; the worker's own `success: false` is reported as 502 so the caller
       can distinguish "the worker ran and failed" from "the gateway could not run it".

  `env` exists because the app derives the LinkedIn worker's configuration from database settings
  (enabled, browser profile dir, search limits) and used to pass it as the child process environment.
  Those settings live in the database, not on the VPS, so they have to travel with the request. Only
  `LINKEDIN_*`-style configuration is ever sent; the gateway is token-authenticated and is expected to be
  reachable only by the application.

  Payloads are serialised per worker: both workers launch a browser, so running two at once on one VPS
  would just make both slower. This mirrors the app's existing MAX_CONCURRENT: 1.

Stdlib only, deliberately. Adding FastAPI/uvicorn here would mean another dependency to install and keep
in sync on the VPS, and the JobSpy virtualenv does not have it.
"""

import json
import os
import subprocess
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

VERSION = "1.0.0"

PROJECT_DIR = Path(
    os.environ.get("WORKER_PROJECT_DIR") or Path(__file__).resolve().parent.parent
)
HOST = os.environ.get("WORKER_GATEWAY_HOST", "127.0.0.1")
PORT = int(os.environ.get("WORKER_GATEWAY_PORT", "8790"))
TOKEN = os.environ.get("WORKER_GATEWAY_TOKEN", "")
TIMEOUT_SECONDS = int(os.environ.get("WORKER_GATEWAY_TIMEOUT_SECONDS", "300"))
MAX_LOG_CHARS = int(os.environ.get("WORKER_GATEWAY_MAX_LOG_CHARS", "8000"))

# Each worker gets its own virtualenv — `vps-setup.sh` creates both separately, because the LinkedIn
# worker pins a different Playwright build from the JobSpy one.
WORKERS = {
    "jobspy": {
        "script": PROJECT_DIR / "scripts" / "jobspy-worker.py",
        "venv": PROJECT_DIR / "scripts" / ".venv" / "bin" / "python3",
    },
    "linkedin": {
        "script": PROJECT_DIR / "scripts" / "linkedin-worker" / "worker.py",
        "venv": PROJECT_DIR / "scripts" / "linkedin-worker" / ".venv" / "bin" / "python3",
    },
}

LOCKS = {name: threading.Lock() for name in WORKERS}


def resolve_python(spec):
    """
    Mirrors `resolvePython()` in src/lib/ingestion/engine.ts: prefer the project virtualenv so we pick up
    JobSpy/Playwright without touching the system interpreter, else fall back to `python3` on PATH.
    """
    override = os.environ.get("WORKER_PYTHON")
    if override:
        return override
    venv = spec["venv"]
    if venv.is_file() and os.access(venv, os.X_OK):
        return str(venv)
    return "python3"


def parse_result(stdout):
    """
    The worker prints exactly one JSON object, but be tolerant: scan from the end and take the first line
    that parses to an object carrying a `success` key. Anything the script prints before that is ignored.
    """
    if not stdout:
        return None
    for line in reversed(stdout.strip().splitlines()):
        line = line.strip()
        if not line.startswith("{"):
            continue
        try:
            parsed = json.loads(line)
        except json.JSONDecodeError:
            continue
        if isinstance(parsed, dict) and "success" in parsed:
            return parsed
    return None


def run_worker(name, payload, extra_env=None):
    spec = WORKERS[name]
    script = spec["script"]

    if not script.is_file():
        return 500, {
            "success": False,
            "error": "worker script not found: %s" % script,
            "jobs": [],
            "stats": {},
        }

    python = resolve_python(spec)
    started = time.time()

    # Inherit the service environment (which carries EnvironmentFile from the systemd unit) and layer the
    # request-supplied configuration on top. Without this the LinkedIn worker would fall back to its own
    # defaults instead of the user's saved settings.
    child_env = dict(os.environ)
    if extra_env:
        child_env.update({str(k): str(v) for k, v in extra_env.items()})

    try:
        proc = subprocess.run(
            [python, str(script)],
            input=json.dumps(payload),
            capture_output=True,
            text=True,
            timeout=TIMEOUT_SECONDS,
            cwd=str(PROJECT_DIR),
            env=child_env,
        )
    except subprocess.TimeoutExpired:
        return 504, {
            "success": False,
            "error": "%s worker exceeded %ss" % (name, TIMEOUT_SECONDS),
            "jobs": [],
            "stats": {},
            "logs": "",
            "durationMs": int((time.time() - started) * 1000),
        }
    except OSError as exc:
        return 500, {
            "success": False,
            "error": "could not execute %s: %s" % (python, exc),
            "jobs": [],
            "stats": {},
        }

    duration_ms = int((time.time() - started) * 1000)
    logs = (proc.stderr or "")[-MAX_LOG_CHARS:]

    result = parse_result(proc.stdout)
    if result is None:
        return 502, {
            "success": False,
            "error": "%s worker produced no parsable JSON (exit %s)" % (name, proc.returncode),
            "jobs": [],
            "stats": {},
            "logs": logs,
            "durationMs": duration_ms,
        }

    result["logs"] = logs
    result["durationMs"] = duration_ms
    result["exitCode"] = proc.returncode

    # 502 rather than 200 when the worker itself reports failure, so the caller can tell a worker-level
    # problem (AUTH_REQUIRED, CHALLENGE, no tasks) from a transport-level one.
    return (200 if result.get("success") else 502), result


def health():
    workers = {}
    for name, spec in WORKERS.items():
        python = resolve_python(spec)
        venv = spec["venv"]
        workers[name] = {
            "script": str(spec["script"]),
            "scriptPresent": spec["script"].is_file(),
            "python": python,
            "venvPresent": venv.is_file() if python != "python3" else None,
            "busy": LOCKS[name].locked(),
        }
    return {
        "status": "ok",
        "version": VERSION,
        "projectDir": str(PROJECT_DIR),
        "timeoutSeconds": TIMEOUT_SECONDS,
        "authenticated": bool(TOKEN),
        "workers": workers,
    }


class Handler(BaseHTTPRequestHandler):
    server_version = "buildairesume-worker-gateway/%s" % VERSION

    def _send(self, status, body):
        payload = json.dumps(body).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def _authorised(self):
        if not TOKEN:
            return True
        return self.headers.get("Authorization", "") == "Bearer %s" % TOKEN

    def do_GET(self):
        path = self.path.rstrip("/")

        # Liveness only: no auth, no detail. Lets a connectivity check or an orchestrator ask "is
        # anything listening?" without being handed the project layout or needing the token.
        if path in ("", "/live"):
            self._send(200, {"status": "ok", "version": VERSION})
            return

        if path == "/health":
            # The detailed view exposes filesystem paths, interpreter locations and worker state. That is
            # only useful to an operator, so it sits behind the same token as /scrape — otherwise anything
            # sharing the Docker network could enumerate the host's layout for free.
            if not self._authorised():
                self._send(401, {"error": "unauthorised"})
                return
            self._send(200, health())
            return

        self._send(404, {"error": "not found"})

    def do_POST(self):
        if self.path.rstrip("/") != "/scrape":
            self._send(404, {"error": "not found"})
            return
        if not self._authorised():
            self._send(401, {"error": "unauthorised"})
            return

        length = int(self.headers.get("Content-Length") or 0)
        raw = self.rfile.read(length) if length else b""
        try:
            body = json.loads(raw or b"{}")
        except json.JSONDecodeError as exc:
            self._send(400, {"error": "invalid JSON body: %s" % exc})
            return

        name = body.get("worker")
        if name not in WORKERS:
            self._send(400, {"error": "unknown worker %r" % name, "known": sorted(WORKERS)})
            return

        payload = body.get("payload") or {}
        if not isinstance(payload, dict):
            self._send(400, {"error": "payload must be an object"})
            return

        extra_env = body.get("env") or {}
        if not isinstance(extra_env, dict):
            self._send(400, {"error": "env must be an object"})
            return

        with LOCKS[name]:
            status, result = run_worker(name, payload, extra_env)
        self._send(status, result)

    def log_message(self, fmt, *args):
        print("[Gateway] %s %s" % (self.address_string(), fmt % args), file=sys.stderr)


def main():
    print("[Gateway] v%s project=%s" % (VERSION, PROJECT_DIR), file=sys.stderr)
    for name, spec in WORKERS.items():
        print(
            "[Gateway] %s -> python=%s script=%s (present=%s)"
            % (name, resolve_python(spec), spec["script"], spec["script"].is_file()),
            file=sys.stderr,
        )

    if not TOKEN:
        print(
            "[Gateway] WARNING: WORKER_GATEWAY_TOKEN is unset, so the gateway is unauthenticated. "
            "That is only acceptable while bound to 127.0.0.1 — set a token before binding to a "
            "routable address.",
            file=sys.stderr,
        )

    server = ThreadingHTTPServer((HOST, PORT), Handler)
    server.daemon_threads = True
    print("[Gateway] listening on %s:%s" % (HOST, PORT), file=sys.stderr)

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("[Gateway] interrupted, shutting down", file=sys.stderr)
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
