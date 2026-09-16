#!/usr/bin/env python3
"""
Dead-code reachability scan for a Next.js App Router project.

A file is DEAD if it is not reachable from any root, where roots are:
  * Next.js convention entry points (route/page/layout/error/... )
  * files the framework or tooling loads by name (middleware, instrumentation,
    sitemap/robots/manifest, Sentry configs)
  * test files (vitest runs them directly)
  * anything referenced from next.config.ts

This is stricter (and more useful) than "has zero importers": it also catches
files that are only imported by other dead files.

Usage: python3 dead-reachability.py <project-root> [--list-dead]
"""
import os
import re
import sys
from collections import defaultdict, deque

SRC_EXT = (".ts", ".tsx")

ENTRY_BASENAMES = {
    "route.ts", "route.tsx",
    "page.tsx", "page.ts",
    "layout.tsx", "layout.ts",
    "template.tsx", "template.ts",
    "default.tsx", "default.ts",
    "error.tsx", "error.ts",
    "global-error.tsx", "global-error.ts",
    "loading.tsx", "loading.ts",
    "not-found.tsx", "not-found.ts",
    "middleware.ts",
    "instrumentation.ts",
    # Next 16 additions — missing these made `src/proxy.ts` look dead, which
    # would have deleted the app's auth/redirect middleware.
    "proxy.ts", "proxy.tsx",
    "instrumentation-client.ts",
    "forbidden.tsx", "forbidden.ts",
    "unauthorized.tsx", "unauthorized.ts",
    "mdx-components.tsx", "mdx-components.ts",
    "sitemap.ts", "robots.ts", "manifest.ts",
    "opengraph-image.tsx", "twitter-image.tsx",
    "icon.tsx", "apple-icon.tsx",
    "sentry.client.config.ts", "sentry.server.config.ts", "sentry.edge.config.ts",
}

# Loaded by name / by tooling, never imported.
NEVER_DEAD_SUBSTR = (
    "/__tests__/",
    ".test.",
    ".spec.",
    "/e2e/",
    "/tests/",
    ".d.ts",
)

IMPORT_RE = re.compile(
    r"""(?:^|[^\w.])import\s*(?:type\s*)?(?:[\s\S]*?\sfrom\s*)?['"]([^'"]+)['"]""",
    re.MULTILINE,
)
DYNAMIC_IMPORT_RE = re.compile(r"""import\s*\(\s*['"]([^'"]+)['"]\s*\)""")
REQUIRE_RE = re.compile(r"""require\s*\(\s*['"]([^'"]+)['"]\s*\)""")
EXPORT_FROM_RE = re.compile(r"""export\s*(?:type\s*)?(?:\*|\{[\s\S]*?\})\s*from\s*['"]([^'"]+)['"]""")


def strip_comments(src):
    out = []
    i, n = 0, len(src)
    state = "code"
    while i < n:
        ch = src[i]
        nxt = src[i + 1] if i + 1 < n else ""
        if state == "code":
            if ch == "/" and nxt == "/":
                state = "line"; i += 2; continue
            if ch == "/" and nxt == "*":
                state = "block"; i += 2; continue
            if ch in "'\"`":
                state = ch
            out.append(ch)
        elif state == "line":
            if ch == "\n":
                state = "code"; out.append(ch)
        elif state == "block":
            if ch == "*" and nxt == "/":
                state = "code"; i += 2; continue
        else:
            if ch == "\\":
                out.append(ch)
                if i + 1 < n:
                    out.append(src[i + 1])
                i += 2; continue
            if ch == state:
                state = "code"
            out.append(ch)
        i += 1
    return "".join(out)


def all_imports(src):
    src = strip_comments(src)
    specs = set()
    for rx in (IMPORT_RE, DYNAMIC_IMPORT_RE, REQUIRE_RE, EXPORT_FROM_RE):
        specs.update(rx.findall(src))
    return specs


def resolve(spec, importer, root):
    if spec.startswith("@/"):
        base = os.path.join(root, "src", spec[2:])
    elif spec.startswith("."):
        base = os.path.normpath(os.path.join(os.path.dirname(importer), spec))
    else:
        return None
    for cand in (base + ".ts", base + ".tsx",
                 os.path.join(base, "index.ts"), os.path.join(base, "index.tsx")):
        if os.path.isfile(cand):
            return os.path.normpath(cand)
    return None


def main(root, list_dead=False, no_tests=False):
    src_dir = os.path.join(root, "src")
    files = []
    for dirpath, dirnames, filenames in os.walk(src_dir):
        dirnames[:] = [d for d in dirnames if d != "node_modules"]
        for name in filenames:
            if name.endswith(SRC_EXT):
                files.append(os.path.normpath(os.path.join(dirpath, name)))
    fileset = set(files)

    edges = defaultdict(set)
    for f in files:
        try:
            with open(f, "r", encoding="utf-8", errors="replace") as fh:
                src = fh.read()
        except OSError:
            continue
        for spec in all_imports(src):
            t = resolve(spec, f, root)
            if t and t in fileset:
                edges[f].add(t)

    def is_test(rel):
        return any(s in rel for s in NEVER_DEAD_SUBSTR)

    roots = set()
    for f in fileset:
        rel = os.path.relpath(f, root)
        if os.path.basename(f) in ENTRY_BASENAMES:
            roots.add(f)
        elif is_test(rel):
            # Test files are loaded by the runner, not imported. With --no-tests
            # we do NOT treat them as roots, so anything reachable only from a
            # test shows up as production-dead.
            if not no_tests:
                roots.add(f)

    # next.config.ts may reference files by path string.
    ncfg = os.path.join(root, "next.config.ts")
    if os.path.isfile(ncfg):
        try:
            cfg = open(ncfg, encoding="utf-8", errors="replace").read()
            for f in fileset:
                rel = os.path.relpath(f, root)
                if os.path.basename(f) in cfg or rel in cfg:
                    roots.add(f)
        except OSError:
            pass

    seen = set(roots)
    q = deque(roots)
    while q:
        cur = q.popleft()
        for nxt in edges.get(cur, ()):
            if nxt not in seen:
                seen.add(nxt)
                q.append(nxt)

    dead = sorted(fileset - seen)
    if no_tests:
        # The test files themselves are trivially "unreached" here; we only care
        # about production files that survive solely because a test imports them.
        dead = [d for d in dead if not is_test(os.path.relpath(d, root))]

    label = "PRODUCTION-DEAD (unreachable without counting tests as roots)" if no_tests \
        else "DEAD (unreachable from any root)"
    print(f"Scanned {len(fileset)} files under src/")
    print(f"Roots: {len(roots)}")
    print(f"Reachable: {len(seen)}")
    print(f"{label}: {len(dead)}\n")

    groups = defaultdict(list)
    for rel in dead:
        r = os.path.relpath(rel, root)
        parts = r.split(os.sep)
        key = os.sep.join(parts[:3]) if len(parts) > 3 else os.sep.join(parts[:-1])
        groups[key].append(r)

    for key in sorted(groups):
        print(f"  {key}/")
        for r in sorted(groups[key]):
            print(f"      {os.path.basename(r)}")

    if list_dead:
        out = "/tmp/dead-prod-files.txt" if no_tests else "/tmp/dead-files.txt"
        with open(out, "w") as fh:
            for rel in dead:
                fh.write(os.path.relpath(rel, root) + "\n")
        print(f"\nWrote {len(dead)} paths to {out}")

    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else ".",
                  "--list-dead" in sys.argv,
                  "--no-tests" in sys.argv))
