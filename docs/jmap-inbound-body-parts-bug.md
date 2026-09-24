# Bug: inbound email bodies never persist — JMAP `textBody` / `htmlBody` are arrays, not strings

**Severity:** high — silent data loss on a core path.
**Component:** `src/lib/services/jmapService.ts` (JMAP client) → `src/services/emailIngestionService.ts`
(email ingestion worker) → `src/models/Communication.ts`.
**Status:** confirmed by first-hand runtime evidence, root-caused, not yet fixed.
**Reported:** 2026-09-20.

---

## 1. Impact

**Every inbound email fails to persist.** The ingestion worker polls the Stalwart JMAP inbox, parses each
message, and then throws when it tries to save the `Communication` record. Because the throw happens
*before* `save()`, no record is created at all — so the tracker never learns about the employer reply,
and the classification / application-state-transition logic downstream never runs.

Nothing surfaces to the user. There is no alert. The only symptom is a repeating server log line.

## 2. Observed symptom

Logged on every poll cycle (the loop polls every 30s). The failure surfaces as a Mongoose
`ValidationError`, and the per-path entries *inside* it are the `CastError`s:

```
ValidationError: Communication validation failed: textBody: Cast to string failed for value
"[ { partId: '1', blobId: 'G1a', size: 812, type: 'text/plain' } ]" (type Array) at path
"textBody", htmlBody: Cast to string failed for value "[ { partId: '2', blobId: 'G1b', size:
1204, type: 'text/html' } ]" (type Array) at path "htmlBody"
```

Concretely, on the error object: `error.name === 'ValidationError'`, and `error.errors` holds one
entry per offending field, each with `name: 'CastError'` and `kind: 'string'`. Reproduced against
the project's own mongoose version — see the appendix.

The `[{partId, blobId, size, …}]` value is the giveaway: it is an **`EmailBodyPart[]`**, not a string.

> **Naming note, so the logs aren't misread as two bugs.** Depending on whether the logger prints
> `err.message`, `err.name`, or the per-field `err.errors`, you will see the top-level
> `ValidationError` line, a nested `CastError` line, or both. They are all the *same* single
> failure. `save()` and `validate()` both report it identically (verified).

## 3. Root cause

Per RFC 8621 §4.1.1, `Email.textBody` and `Email.htmlBody` are **not** the message text. They are arrays
of `EmailBodyPart` descriptors, i.e. *pointers*:

```json
"textBody": [
  { "partId": "1", "blobId": "G1a", "size": 812, "type": "text/plain" }
]
```

The actual text lives in a sibling property, `bodyValues`, keyed by `partId`:

```json
"bodyValues": {
  "1": { "value": "Hi Amloh, thanks for applying…", "isTruncated": false }
}
```

So rendering a body is a two-step lookup: `textBody[].partId` → `bodyValues[partId].value`.

The client declares them as plain strings, so that lookup never happens.

**`src/lib/services/jmapService.ts:269-270`**

```ts
export interface JmapEmail {
  // …
  textBody?: string;      // ← WRONG: actually EmailBodyPart[]
  htmlBody?: string;      // ← WRONG: actually EmailBodyPart[]
  bodyValues?: Record<string, { value: string; isTruncated: boolean }>;   // ← the real text is here
  // …
}
```

**The strongest evidence that this is a genuine mistake and not a deliberate simplification:** the
*outbound* path in the very same file gets the shape right.

**`src/lib/services/jmapService.ts:524-527`** (`sendEmail` → `Email/set`):

```ts
bodyValues: {
  '': { value: params.textBody, isTruncated: false },
},
textBody: [''],        // ← array of partIds. Correct JMAP.
```

So the author knew `textBody` is an array of partIds when *sending*, but typed it as a string when
*receiving*. (`SendEmailParams.textBody: string` at line 464 is correct — outbound text really is a
string. Only `JmapEmail` is wrong.)

## 4. How the failure propagates

**`src/services/emailIngestionService.ts:287-288`** — the array is written straight into a field the
schema declares as a string:

```ts
const communication = new Communication({
  // …
  textBody: email.textBody,     // EmailBodyPart[] → Mongoose expects String
  htmlBody: email.htmlBody,
  // …
});

await communication.save();     // ← line 308. Throws here.
```

**`src/models/Communication.ts:187-188`** — the schema side:

```ts
textBody: { type: String },
htmlBody: { type: String },
```

Mongoose refuses the cast, `save()` rejects with a `ValidationError` (a `CastError` per field
inside it), and the `catch` at `emailIngestionService.ts:383-390` logs and rethrows. No document is
written. Note the catch is *outside* the constructor — the throw happens at `save()`, not at
`new Communication(...)` — so nothing partial is left behind either.

**Why a second failure mode is hiding behind this one:** `emailIngestionService.ts:242` reads the body
*before* the save:

```ts
const bodySnippet = email.preview || email.textBody?.substring(0, 500) || '';
```

`email.textBody?.substring` guards only against `null`/`undefined`. If `textBody` is an array,
`textBody.substring` is `undefined`, and calling it throws
`TypeError: email.textBody?.substring is not a function`.

That does **not** fire today only because `preview` is present and `||` short-circuits first. `preview` is
requested at `jmapService.ts:342`. **This is a second latent bug sitting behind the first** — if the
server ever stops returning `preview`, the failure mode changes from a body-cast failure to a
`TypeError` at a different line, which will look like a new bug.

### 4a. Trap in the naive fix: `bodySnippet` is `required: true`

Resolving the body is necessary but **not sufficient**. `Communication.ts:186` declares:

```ts
bodySnippet: { type: String, required: true },
```

Mongoose treats the empty string as *missing* for a `required` String. Verified against this project's
mongoose:

```
FAILS  -> bodySnippet: ""          | ValidationError | ... Path `bodySnippet` is required.
FAILS  -> bodySnippet: undefined   | ValidationError | ... Path `bodySnippet` is required.
PASSES -> bodySnippet: "(no body)"
```

So a message with no `preview` **and** no resolvable text body (e.g. an HTML-only email where
`htmlBody` resolved but `textBody` did not) would simply swap one `ValidationError` for another — and
the new one names a *different* field, so it will read as a fresh bug.

**The fix must supply a non-empty fallback**, e.g.:

```ts
const bodySnippet = email.preview || textBody.substring(0, 500) || '(no text body)';
```

or make `bodySnippet` genuinely optional. Decide deliberately; do not leave `''` reachable.

## 5. A second, independent defect: `bodyValues` may never be fetched

**`src/lib/services/jmapService.ts:340-351`** (`getEmails`, which `searchEmails` delegates to — and
`searchEmails` is what the ingestion worker calls):

```ts
const emailProperties = properties || [
  'id', 'threadId', 'mailboxIds', 'keywords', 'from', 'to', 'cc',
  'subject', 'receivedAt', 'textBody', 'htmlBody', 'size', 'preview',
  'headers',                                  // ← 'bodyValues' is NOT here
];

const emails = await jmapCall('Email/get', {
  ids: emailIds,
  properties: emailProperties,
  fetchTextBodyValues: true,                  // ← but these are set…
  fetchHTMLBodyValues: true,
});
```

`fetchTextBodyValues` / `fetchHTMLBodyValues` are supposed to populate `bodyValues` (RFC 8621 §4.1.4), so
these may be sufficient. But `properties` is an explicit allow-list, and `bodyValues` is not on it —
whether the server honours the fetch flags when the property is not listed is **server-specific**.

`getEmailById` (line 363-379) *does* list `bodyValues` in its properties. So the two functions disagree.

**Do not assume.** Confirm against the live server first (see §7, step 1) before deciding whether to also
add `'bodyValues'` to the `getEmails` property list.

## 6. Fix sketch

The fix is contained. Suggested shape:

1. **Correct the types** (`jmapService.ts:269-270`). Accept both shapes so nothing breaks if a server
   returns a plain string:

   ```ts
   export interface EmailBodyPart {
     partId: string;
     blobId?: string;
     size?: number;
     type?: string;
     name?: string;
     charset?: string;
     disposition?: string;
     cid?: string;
     subParts?: EmailBodyPart[];
   }

   export interface JmapEmail {
     // …
     textBody?: EmailBodyPart[] | string;
     htmlBody?: EmailBodyPart[] | string;
     bodyValues?: Record<string, { value: string; isTruncated: boolean }>;
     // …
   }
   ```

2. **Add one resolver** in `jmapService.ts`, and use it everywhere a body is needed. Do not inline the
   logic at the call sites — it needs to handle the string case, the array case, `isTruncated`, and a
   missing `bodyValues` entry, and it should be unit-testable on its own.

   ```ts
   /** Resolve a JMAP body property to text. Handles both EmailBodyPart[] and a plain string. */
   export function resolveBodyText(
     body: EmailBodyPart[] | string | undefined,
     bodyValues: JmapEmail['bodyValues']
   ): string {
     if (!body) return '';
     if (typeof body === 'string') return body;              // tolerate non-conforming servers
     return body
       .map((part) => bodyValues?.[part.partId]?.value ?? '')
       .filter(Boolean)
       .join('\n');
   }
   ```

3. **Use it at both consumers** in `emailIngestionService.ts`:

   ```ts
   const textBody = resolveBodyText(email.textBody, email.bodyValues);
   const htmlBody = resolveBodyText(email.htmlBody, email.bodyValues);
   // NOTE the non-empty fallback — see §4a. `''` fails `bodySnippet: required`.
   const bodySnippet = email.preview || textBody.substring(0, 500) || '(no text body)';
   // …
   textBody,
   htmlBody,
   ```

4. **Optionally** add `'bodyValues'` to the `getEmails` property list (line 340-344) if step 1 of §7
   shows it is not being returned. Keep `getEmails` and `getEmailById` consistent.

**Do not change `Communication.ts:187-188`.** Storing the resolved text as a `String` is correct — the
`CommsPanel` component renders it directly (`src/components/dashboard/jobs/CommsPanel.tsx:1241-1252`).
Storing the raw part descriptors in Mongo would just move the problem downstream. (Note this is the
`textBody` / `htmlBody` pair only. `bodySnippet` at line 186 is a separate decision — see §4a and §9.)

## 7. Verification

**Step 1 — confirm the wire shape.** Run this against the live server before and after the fix. Substitute
the JMAP base URL and credentials (`STALWART_JMAP_URL`, `STALWART_JMAP_USER`, `STALWART_JMAP_PASSWORD`).

```bash
# Session, to get apiUrl
curl -s -u "$STALWART_JMAP_USER:$STALWART_JMAP_PASSWORD" \
  "$STALWART_JMAP_URL/session" | python3 -m json.tool | head -30

# Then, against the apiUrl from above — note what textBody/htmlBody/bodyValues actually contain
curl -s -u "$STALWART_JMAP_USER:$STALWART_JMAP_PASSWORD" \
  -H 'Content-Type: application/json' \
  -d '{
        "using": ["urn:ietf:params:jmap:core", "urn:ietf:params:jmap:mail"],
        "methodCalls": [["Email/get", {
          "ids": ["<a real email id>"],
          "properties": ["id","subject","preview","textBody","htmlBody","bodyValues"],
          "fetchTextBodyValues": true,
          "fetchHTMLBodyValues": true
        }, "c1"]]
      }' \
  "<apiUrl>" | python3 -m json.tool
```

Expected: `textBody` is an array of `{partId, blobId, size, type}` objects, and `bodyValues` contains the
readable text. **If `bodyValues` comes back empty, that is defect §5 and the property list needs
updating too.**

**Step 2 — regression test.** Add a unit test for `resolveBodyText` covering:
- `EmailBodyPart[]` + populated `bodyValues` → the text
- `EmailBodyPart[]` + missing `bodyValues` entry → `''`, no throw
- a plain string → returned as-is
- `undefined` → `''`
- multiple parts → joined in order

No test runner note: `npm test` (vitest) currently cannot run in this sandbox environment because it reads
`.env` during config resolution. If that blocks you, bundle the module with esbuild and assert in plain
Node — see the `verify-build-and-runtime` skill.

**Step 3 — end-to-end.** After deploying, confirm the log line stops appearing and that a real inbound
email creates a `Communication` document:

```js
// in mongosh
db.communications.find({ direction: 'inbound' })
  .sort({ createdAt: -1 }).limit(3)
  .forEach(d => print(d.subject, '|', (d.textBody || '').slice(0, 80)))
```

The body must be a readable string, not `[object Object]` or a JSON array.

## 8. Blast radius

Files that must change:

| File | Line(s) | Change |
|------|---------|--------|
| `src/lib/services/jmapService.ts` | 269-270 | Correct `textBody` / `htmlBody` types |
| `src/lib/services/jmapService.ts` | new | Add `resolveBodyText()` + `EmailBodyPart` |
| `src/lib/services/jmapService.ts` | 340-344 | Add `'bodyValues'` **if** §7 step 1 requires it |
| `src/services/emailIngestionService.ts` | 242 | Resolve before `.substring` (fixes the latent `TypeError`) |
| `src/services/emailIngestionService.ts` | 287-288 | Resolve before writing to `Communication` |
| `src/models/Communication.ts` | 186 | **Only if** you resolve §4a by relaxing `required` instead of adding a fallback |

Files that are **already correct** and must not be changed:

- `src/models/Communication.ts:187-188` — `String` is the right type for stored, resolved text.
- `src/lib/services/jmapService.ts:464, 524-527, 597-598, 748` — the outbound `sendEmail` path already
  uses the correct JMAP shape (`textBody: ['']` + `bodyValues`). Verified at each line.
- `src/app/api/tracker/emails/route.ts:99` — reads the **stored** `Communication`, where `textBody` is
  already a `String`, so its `.substring` is safe. It does use the same `?.substring` shape as the
  buggy line, so it is worth a glance, but it is not part of this fix.
- `src/components/dashboard/jobs/CommsPanel.tsx:1241-1252` — reads the stored document and renders it.
  Correct as written, **but see §9** before enabling it.

## 9. ⚠️ What this fix *activates*: unsanitized `htmlBody` reaches `dangerouslySetInnerHTML`

**Read this before merging the fix.** It is not a reason to delay the fix — it is a reason to plan one
extra line while you are in here.

`src/components/dashboard/jobs/CommsPanel.tsx:1241-1247` renders the stored body as raw HTML:

```tsx
{comm.htmlBody ? (
  <div className="prose prose-slate dark:prose-invert max-w-none text-xs leading-relaxed"
       dangerouslySetInnerHTML={{ __html: comm.htmlBody }} />
) : (
```

There is **no sanitization anywhere in the project** — no `dompurify`, no `sanitize-html`, no
`isomorphic-dompurify` in `package.json`, and no `sanitize`/`DOMPurify` import in `CommsPanel.tsx`.

**Today this render branch is effectively dead.** Because the inbound write throws before `save()`,
`htmlBody` is never populated from a real email. The only writers are:

| Writer | Content source | Risk |
|---|---|---|
| `emailIngestionService.ts:288` (inbound) | **arbitrary external senders** | **the one that matters** |
| `api/communications/send/route.ts:51,81` (outbound) | the user's own composer, session-authenticated (`401` without a session) | self-inflicted |
| `api/communications/seed/route.ts` | hardcoded literals | none |

The moment inbound parsing works, an attacker-controlled HTML email body is stored and then rendered
with `dangerouslySetInnerHTML` inside the user's **authenticated dashboard session** — stored XSS, with
the user's session as the target. An employer-reply inbox is a perfectly ordinary vector for this; it
does not require the user to do anything unusual.

**Recommended:** sanitize on render (or on write) as part of this change — `isomorphic-dompurify` is the
usual pick for a Next.js App Router component that renders on both server and client. If that is out of
scope for this fix, then at minimum **do not ship the inbound fix and the HTML rendering enabled in the
same release without deciding this explicitly.** Rendering `textBody` and dropping `htmlBody` is a valid
interim choice.

## 10. Why this stayed invisible

Worth fixing the *class* of problem, not just this instance:

- The write failed **inside an ingestion worker with no user-facing surface**, so a total failure of
  inbound email looked identical to "no new email".
- The error was logged as a raw `ValidationError` / nested `CastError` with no mention of the field's
  semantic mismatch, so it read as a schema problem rather than a protocol-shape problem.
- The ingestion loop retried on a fixed 30s interval with no backoff and logged the full stack every
  tick, which buried the signal in repetition. **This part has since been fixed** — the loop now backs off
  exponentially (30s → 5min) and logs once per failure streak, so this bug would now be far more visible.
- There was no assertion that a parsed message actually produced a record. **A counter of
  `fetched / persisted / failed` surfaced in `getIngestionStatus()` would have caught it immediately.**

---

## Appendix: minimal reproduction

No JMAP server needed — the failure is entirely a client-side shape mismatch. Run this from the
**project root** so `mongoose` resolves (a copy in `/tmp` will fail with `MODULE_NOT_FOUND`).

The schema below mirrors the real one, including `bodySnippet: required` (§4a):

```js
const mongoose = require('mongoose');

const Communication = mongoose.model('Communication', new mongoose.Schema({
  subject: { type: String, required: true },
  bodySnippet: { type: String, required: true },   // ← required, and '' does NOT satisfy it
  textBody: { type: String },
  htmlBody: { type: String },
}));

// ── Case 1: exactly what the ingestion worker passes today ──────────────
const doc = new Communication({
  subject: 'Interview invitation',
  bodySnippet: 'Hi Amloh, thanks for applying…',
  textBody: [{ partId: '1', blobId: 'G1a', size: 812, type: 'text/plain' }],
  htmlBody: [{ partId: '2', blobId: 'G1b', size: 1204, type: 'text/html' }],
});

doc.validate().catch(e => {
  console.log(e.name);                                        // ValidationError
  console.log(e.message);                                     // Communication validation failed: …
  console.log(Object.entries(e.errors)
    .map(([k, v]) => `${k}:${v.name}`).join(', '));            // textBody:CastError, htmlBody:CastError
});
```

Verified output (this project's mongoose):

```
ValidationError
Communication validation failed: textBody: Cast to string failed for value "[ { partId: '1', blobId: 'G1a', size: 812, type: 'text/plain' } ]" (type Array) at path "textBody", htmlBody: Cast to string failed for value "[ { partId: '2', blobId: 'G1b', size: 1204, type: 'text/html' } ]" (type Array) at path "htmlBody"
textBody:CastError, htmlBody:CastError
```

`save()` reports the identical `ValidationError` — it is the same validation pass, not a separate
failure mode.

```js
// ── Case 2: the latent TypeError (§4) ───────────────────────────────────
const email = { preview: undefined, textBody: [{ partId: '1' }] };
try {
  const s = email.preview || email.textBody?.substring(0, 500) || '';
  console.log('UNEXPECTED:', JSON.stringify(s));
} catch (e) {
  console.log(e.constructor.name, '—', e.message);
}
// TypeError — email.textBody?.substring is not a function

// ── Case 3: the trap in the naive fix (§4a) ─────────────────────────────
new Communication({
  subject: 's',
  bodySnippet: '',        // what `resolveBodyText()` returns when nothing resolves
  textBody: '',
}).validate().catch(e => console.log(e.name, '—', e.message));
// ValidationError — Communication validation failed: bodySnippet: Path `bodySnippet` is required.
```

Case 3 is the one to internalise: **resolving the body correctly can still fail validation**, on a
different field, if the snippet ends up empty.
