## What this changes

<!-- One or two sentences. What behaviour changes, and for whom? -->

## Why

<!-- Link the issue, or explain the problem. If there is no issue, say what broke or what is missing. -->

## How it was verified

<!--
Be specific — "it builds" is not verification of behaviour. Name the command you ran and what it
printed, or the route/flow you exercised and what you observed. If you could not run something,
say so plainly rather than leaving this blank.
-->

- [ ] `cd apps/airesume_app && npm test`
- [ ] `cd apps/airesume_app && npm run build`
- [ ] `cd apps/resumebuilder-worker && npm run build`
- [ ] Manually exercised:

## Checklist

- [ ] **No secrets.** No credential, token, key, connection string or real email address is added to
      the source. Configuration goes in env files; only `.env.example` templates are committed.
      (If a secret was already committed, say so in the description — rotation comes first, deletion
      second. See [SECURITY.md](../SECURITY.md).)
- [ ] **No instance-specific data.** No production hostname, IP, account id, database name or
      operator path is hardcoded — the repository is public.
- [ ] **Env contract updated.** Any new variable is added to the relevant `.env.example` *and*
      documented in `docs/configuration.md`.
- [ ] **Migrations/backfills** are included if the schema changed, and are backward-compatible with
      existing documents.
- [ ] **Docs updated** if behaviour, setup or configuration changed.

## Screenshots

<!-- For UI changes. Delete this section otherwise. -->
