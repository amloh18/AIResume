# Sign-in outage — root cause and fix (2026-09-20)

**Symptom as reported:** all three sign-in paths fail — "email 2FA routes back to sign-in",
"email + password not working", "Google not working".

**Root cause:** a session cookie written under a name that nothing reads. One line in
`create-session/route.ts` derived the cookie name from `NODE_ENV` **alone**, while
`getToken()` / `getServerSession()` derive it from `NODE_ENV` **and** whether `NEXTAUTH_URL`
is https. In any deployment where those disagree, the browser is handed a session cookie the
app never looks for.

**Status:** fixed. Verified by reproduction, a before/after matrix, a clean `tsc`, and a
production build. One environment variable on the VPS also needs confirming (below).

---

## 1. Why this was hard to see

Every step *before* the cookie looked successful, and every step *after* looked like a
session problem. That combination sends you hunting in the wrong place — which is exactly
what happened; the first hypothesis (a failed `LoginSession` write) was wrong.

The chain for the 2FA path:

```
POST /api/auth/complete-two-factor-signin   -> code verified, returns userId
POST /api/auth/create-session               -> signs JWT, writes LoginSession row,
                                               returns { success: true },
                                               sets cookie "__Secure-next-auth.session-token"
window.location = /dashboard/jobs
proxy.ts  getToken() reads "next-auth.session-token"   -> no token -> redirect /sign-in
dashboard/layout.tsx  session.user.id missing          -> redirect /sign-in
```

So the database fills with **perfectly valid sessions** while every sign-in bounces. Nothing
throws. Nothing is logged as an error.

## 2. Evidence

### 2.1 The database says the writes succeed

Production uses the **`airesume`** database (`MONGODB_DB=airesume`; the `test` database is the
local dev one). Inspecting `airesume.loginsessions`:

| Measure | Value |
|---|---|
| total rows | 16 |
| revoked (`revokedAt` set) | **0** |
| expired (`expiresAt <= now`) | **0** |
| valid (not revoked, unexpired) | **16** |
| `jti` values | all 36-char UUIDs |
| `userId` values | all resolve to real users |
| indexes | `jti_1` (unique), `userId_1_expiresAt_1`, `userId_1_revokedAt_1_expiresAt_1` |

And a burst of **7 rows in ~100 seconds** (15:26:54 → 15:28:33) — the signature of a retry
loop: sign in, get bounced, try again.

### 2.2 The validation query is not the problem

Running the app's own `SessionService.validateSession()` and `getSessionState()` against
those real `jti` values, through the real Mongoose model:

```
jti=1bdebe76-…   validateSession() -> true    getSessionState() -> ok
jti=7ffefd1c-…   validateSession() -> true    getSessionState() -> ok
jti=7bf01573-…   validateSession() -> true    getSessionState() -> ok
```

The rows are fine. The tokens simply never reach the code that would read them.

### 2.3 The cookie name disagrees — before and after

Four deployment shapes, comparing the name `create-session` writes against the name
`getToken()` reads:

| `NODE_ENV` | `NEXTAUTH_URL` | BEFORE | AFTER |
|---|---|---|---|
| development | `http://localhost:3000` | ok | ok |
| **production** | **(unset)** | **MISMATCH** | ok |
| **production** | **`http://buildairesume.com`** | **MISMATCH** | ok |
| production | `https://buildairesume.com` | ok | ok |

The two `MISMATCH` rows are the outage: `__Secure-next-auth.session-token` written,
`next-auth.session-token` read.

## 3. The fix

The name and the `Secure` flag are now derived in **one place** and imported everywhere:

**`src/lib/auth/session-cookie.ts` (new)** — `isSecureSessionCookie()`,
`getSessionCookieName()`, `getSessionCookieOptions()`, and `warnIfAuthUrlUnusable()`. The
condition mirrors next-auth's own `getToken()` default
(`NEXTAUTH_URL?.startsWith('https://') ?? !!process.env.VERCEL`) plus a `NODE_ENV` guard, so a
local HTTP dev server never emits a `Secure` cookie.

| File | Change |
|---|---|
| `src/lib/auth/session-cookie.ts` | **new** — single source of truth |
| `src/app/api/auth/create-session/route.ts` | **the bug** — now uses the helper |
| `src/lib/auth/unified-auth-service.ts` | `getAuthConfig()` uses the helper (reader side) |
| `src/app/api/auth/dev-bypass/route.ts` | was hardcoded `next-auth.session-token` + `secure: false` |
| `src/app/api/auth/signout/route.ts` | derivation aligned (it already cleared both variants) |

`secure` and the `__Secure-` prefix must always agree — a `__Secure-` cookie set without
`Secure` is **rejected by the browser**, which would look identical to this bug from the
outside.

## 4. ⚠️ VPS action required

**Set `NEXTAUTH_URL` to the public https origin.**

```bash
NEXTAUTH_URL=https://buildairesume.com
```

The code fix makes sign-in work regardless, but an unset or non-https `NEXTAUTH_URL` has a
**second, independent consequence**: NextAuth builds the OAuth `redirect_uri` from it, so
Google gets `http://localhost:3000/api/auth/callback/google` and rejects the sign-in with
`redirect_uri_mismatch`. That is almost certainly the whole of "Google auth not working".

The app now logs this once at startup, loudly:

```
[auth] NEXTAUTH_URL is missing or not https in production. OAuth callbacks will be built
against the wrong origin (redirect_uri_mismatch) and the session cookie will be named "…".
Set NEXTAUTH_URL to the public https origin, e.g. https://buildairesume.com
```

Also worth confirming the production environment actually has `MONGODB_DB=airesume` — if it is
absent and the URI has no database path, Mongoose silently defaults to `test`.

## 5. Also changed in this pass

**`crypto` was never imported.** `unified-auth-service.ts` is `@ts-nocheck`, so
`crypto.randomUUID()` relied on a global that TypeScript never checked. It happens to exist in
Node 20+, but a missing global there throws *outside* the surrounding `try/catch` and would
break every sign-in flow at once. Now imported explicitly.

**Session validation is state-aware and loud.** `getSessionState()` distinguishes `ok` /
`missing` / `revoked` / `expired`. `revoked` and `expired` still fail closed — revocation sets
`revokedAt` rather than deleting the row, so nothing is weakened — but a `missing` row no
longer signs the user out, because session recording is best-effort telemetry wrapped in a
`catch` that only logs. A failed write should not be able to brick authentication. The
diagnostic log on that catch now names the error, the `userId` and the `jti`.

**Dev bypass is now explicitly enableable and origin-gated.** It already existed and was fully
wired — it was just invisible under `next start`, because `NODE_ENV=production` hides it. Two
independent gates now: an env flag (`ENABLE_DEV_BYPASS=true`, or
`NEXT_PUBLIC_ENABLE_DEV_BYPASS=true` for the buttons) **and** a server-side check that the
request came from localhost. The route re-checks on every request; the client flag is only a
render hint.

## 6. Ruled out (with evidence)

Worth recording, because each of these looked plausible:

| Hypothesis | Verdict |
|---|---|
| `LoginSession` write fails silently | **No** — 16 rows, all valid |
| `validateSession()` query or model wrong | **No** — returns `true` for real jtis |
| A TTL index deleting sessions immediately | **No** — no TTL index on the collection |
| Sessions being revoked | **No** — `revokedAt` is unset on all 16 |
| Duplicate `jti` index → uniqueness unenforced | **No** — `jti_1` is unique |
| `NEXTAUTH_SECRET` missing | **No** — writes succeed, which requires it |
| Wrong database / connection | **No** — `airesume` is correct and consistent |
| `crypto.randomUUID()` unavailable | **No** — the rows contain real UUIDs |

## 7. Verification

| Check | Result |
|---|---|
| Cookie-name matrix, 4 deployment shapes | before: 2 mismatches → after: **0** |
| Live credentials sign-in (dev server, real DB) | session cookie set; `/api/auth/session` returns the user; `/dashboard/jobs` → 200, no bounce |
| Live `create-session` (the 2FA path) | cookie readable; `/dashboard/jobs` → 200, no bounce |
| `npx tsc --noEmit` | clean |
| `next build`, **no env at all** | exit 0, `ƒ Proxy (Middleware)` present |
| Temp probe scripts | removed |
| Seeded repro user | removed from the `test` database |

> **Commit note:** `.gitignore` line 52 is a blanket `*.md`, so this file needs
> `git add -f docs/auth-signin-fix-2026-09-20.md`.

## 8. If it still fails after deploying

The `NEXTAUTH_URL` warning line above is the first thing to check. Then confirm which cookie
name the browser actually holds:

```js
// in the browser console on buildairesume.com
document.cookie.split('; ').map(c => c.split('=')[0])
```

It must contain the same name the app logs at startup. If the two ever disagree again, the
derivation has been duplicated somewhere — `grep -rn "session-token" src/` and route it through
`@/lib/auth/session-cookie`.
