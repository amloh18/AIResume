# Security Policy

## Reporting a vulnerability

Please do **not** open a public issue for a security problem. Report it privately via GitHub's
[Report a vulnerability](../../security/advisories/new) form, or email the maintainers.

Include: what you found, where, how to reproduce it, and the impact you believe it has. We aim to
acknowledge within 72 hours.

## Secrets policy

This repository is public. The rules are absolute:

1. **No secret is ever committed.** API keys, database URIs, JWT/NEXTAUTH secrets, OAuth client
   secrets, SMTP passwords, webhook signing secrets and private keys live in environment files only.
2. **Only templates are committed.** Every project ships an `.env.example` containing key names and
   placeholder values. Never a real value — not even a "test" or "dev" one, because those are the
   ones that end up in production.
3. **Environment files are ignored by git.** `.gitignore` covers `.env` and `.env.*` at every depth,
   with explicit negations for the `.example` templates. See the "Environment Variables" section.
4. **No database directories or dumps.** A local MongoDB data directory (`.tmp-mongo/`) was once
   tracked here; it is now ignored. Database files are data, not source.
5. **Redact before pasting.** Shell transcripts, screenshots, issues and PR descriptions are a
   common leak vector. Commands such as `docker service inspect`, `printenv`, `ps aux | grep` and
   `docker compose config` print secrets in clear text — filter to key *names* before sharing output.

## Environment setup

Each project carries its own template. Copy it and fill in your own values:

```bash
cp apps/airesume_app/.env.example                  apps/airesume_app/.env.local
cp apps/resumebuilder-worker/.env.example apps/resumebuilder-worker/.env
```

`.env.local` and `.env` are git-ignored. Never rename a filled-in file to something that looks like
a template, and never commit a filled-in template.

## If a secret is exposed

Assume anything that reached a remote is compromised — git history, a fork, or a CI log is enough.

1. **Rotate first.** Rotating is the fix; removing the text is not. Delete the credential at the
   provider and issue a new one.
2. **Then purge.** Removing a file in a later commit does not remove it from history. Use
   `scripts/publish/prepare-public-release.sh`, which rewrites history to drop the file and verifies
   that no credential shape survives in any reachable blob.
3. **Force-push and tell collaborators.** Every commit hash after the rewrite changes; anyone with a
   clone must re-clone rather than pull.

## Supported versions

Only the latest commit on the default branch is supported.
