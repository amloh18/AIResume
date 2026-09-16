#!/usr/bin/env python3
"""
Route-contract audit.

The bug class this catches: a client `fetch()` sends an HTTP method that the
target route file does not export. TypeScript cannot see this, ESLint cannot see
it, and the build cannot see it — it only fails at runtime with a 405, and if the
caller does an optimistic update it fails *silently*.

That is exactly how `PATCH /api/user/settings` shipped (the route exports GET and
PUT only), so this audit exists to find any siblings.

Usage: python audit-routes.py <project-root>
"""
import os
import re
import sys
from collections import defaultdict

HTTP_METHODS = ("GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS")

# ---------------------------------------------------------------- route index
EXPORT_FN_RE = re.compile(
    r"export\s+(?:async\s+)?(?:function|const|let|var)\s+(" + "|".join(HTTP_METHODS) + r")\b"
)
# `export { handler as GET, handler as POST };` — NextAuth and other wrappers
# re-export a single handler under several verbs. Missing this form produced a
# false positive on /api/auth/[...nextauth].
EXPORT_LIST_RE = re.compile(r"export\s*\{([^}]*)\}")
EXPORT_ALIAS_RE = re.compile(r"as\s+(" + "|".join(HTTP_METHODS) + r")\b")


def strip_comments(src):
    """
    Remove // and /* */ comments while respecting string literals.

    Needed because call patterns appear inside JSDoc examples, and because a
    naive `//` strip would truncate URLs like https://… inside string literals.
    """
    out = []
    i, n = 0, len(src)
    state = "code"
    while i < n:
        ch = src[i]
        nxt = src[i + 1] if i + 1 < n else ""
        if state == "code":
            if ch == "/" and nxt == "/":
                state = "line"
                i += 2
                continue
            if ch == "/" and nxt == "*":
                state = "block"
                i += 2
                continue
            if ch in "'\"`":
                state = ch
            out.append(ch)
        elif state == "line":
            if ch == "\n":
                state = "code"
                out.append(ch)
        elif state == "block":
            if ch == "*" and nxt == "/":
                state = "code"
                i += 2
                continue
        else:  # inside a string literal
            if ch == "\\":
                out.append(ch)
                if i + 1 < n:
                    out.append(src[i + 1])
                i += 2
                continue
            if ch == state:
                state = "code"
            out.append(ch)
        i += 1
    return "".join(out)


def exported_methods(src):
    methods = set(EXPORT_FN_RE.findall(src))
    for group in EXPORT_LIST_RE.findall(src):
        methods.update(EXPORT_ALIAS_RE.findall(group))
    return methods


def normalise_route_path(api_dir, route_file):
    """src/app/api/jobs/[id]/route.ts -> /api/jobs/:id"""
    rel = os.path.relpath(route_file, api_dir)
    rel = rel[: -len("route.ts")].strip(os.sep)
    parts = [p for p in rel.split(os.sep) if p]
    parts = [":param" if p.startswith("[") else p for p in parts]
    return "/api" + ("/" + "/".join(parts) if parts else "")


def build_route_index(root):
    """path -> set of exported methods. Also records which files are dynamic."""
    api_dir = os.path.join(root, "src", "app", "api")
    index = {}
    for dirpath, _dirnames, filenames in os.walk(api_dir):
        if "route.ts" not in filenames:
            continue
        route_file = os.path.join(dirpath, "route.ts")
        with open(route_file, "r", encoding="utf-8", errors="replace") as fh:
            src = fh.read()
        methods = exported_methods(strip_comments(src))
        path = normalise_route_path(api_dir, route_file)
        index[path] = {"methods": methods, "file": os.path.relpath(route_file, root)}
    return index


# ------------------------------------------------------------- client calls
# fetch('<literal>')  |  fetch(`/api/x/${id}/y`)  |  authenticatedFetch(...)
CALL_RE = re.compile(
    r"(?:authenticatedFetch|fetch)\s*\(\s*[`'\"]([^`'\"]+)[`'\"]",
)
METHOD_RE = re.compile(r"method\s*:\s*[`'\"]([A-Za-z]+)[`'\"]")

# How far past the URL literal to look for `method:` — covers multi-line options.
LOOKAHEAD = 400

SRC_EXT = (".ts", ".tsx")


def callsite_method(src, match_end):
    """Find the `method:` for this call, but stop at the next fetch( to avoid
    attributing a later call's method to this one."""
    window = src[match_end : match_end + LOOKAHEAD]
    nxt = CALL_RE.search(window)
    if nxt:
        window = window[: nxt.start()]
    m = METHOD_RE.search(window)
    return m.group(1).upper() if m else "GET"  # fetch defaults to GET


def matches_route(call_path, route_path):
    """Segment-wise match, ':param' matches any single segment."""
    a = [p for p in call_path.split("?")[0].split("/") if p]
    b = [p for p in route_path.split("/") if p]
    if len(a) != len(b):
        return False
    for x, y in zip(a, b):
        if y == ":param":
            continue
        if x.startswith("$") or x == "{}":  # un-substituted template hole
            continue
        if x != y:
            return False
    return True


def main(root):
    index = build_route_index(root)
    print(f"Indexed {len(index)} route files under src/app/api\n")

    mismatches = []
    unknown = []
    checked = 0

    src_dir = os.path.join(root, "src")
    for dirpath, _dirnames, filenames in os.walk(src_dir):
        if "node_modules" in dirpath:
            continue
        for name in filenames:
            if not name.endswith(SRC_EXT):
                continue
            full = os.path.join(dirpath, name)
            with open(full, "r", encoding="utf-8", errors="replace") as fh:
                src = strip_comments(fh.read())
            for m in CALL_RE.finditer(src):
                raw_path = m.group(1)
                if not raw_path.startswith("/api"):
                    continue
                # Template holes: /api/jobs/${id} -> /api/jobs/$  (wildcard seg)
                norm = re.sub(r"\$\{[^}]*\}", "$", raw_path)
                method = callsite_method(src, m.end())
                checked += 1

                candidates = [p for p in index if matches_route(norm, p)]
                if not candidates:
                    unknown.append((os.path.relpath(full, root), raw_path, method))
                    continue
                if not any(method in index[c]["methods"] for c in candidates):
                    line = src[: m.start()].count("\n") + 1
                    exported = sorted(
                        set().union(*(index[c]["methods"] for c in candidates))
                    )
                    mismatches.append(
                        {
                            "caller": os.path.relpath(full, root),
                            "line": line,
                            "path": raw_path,
                            "method": method,
                            "exported": exported,
                            "route_file": index[candidates[0]]["file"],
                        }
                    )

    print(f"Checked {checked} /api call sites\n")

    print("=" * 78)
    print("METHOD / ROUTE MISMATCHES  (runtime 405 — the bug class being hunted)")
    print("=" * 78)
    if not mismatches:
        print("  none found")
    for mm in mismatches:
        print(f"  {mm['caller']}:{mm['line']}")
        print(f"    calls   {mm['method']:6} {mm['path']}")
        print(f"    route   {mm['route_file']}")
        print(f"    exports {', '.join(mm['exported'])}")
        print()

    if unknown:
        print("=" * 78)
        print(f"UNRESOLVED CALLS ({len(unknown)}) — route not found; review manually")
        print("=" * 78)
        seen = set()
        for caller, path, method in unknown:
            key = (path, method)
            if key in seen:
                continue
            seen.add(key)
            print(f"  {method:6} {path}    ({caller})")

    return 1 if mismatches else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else "."))
