# Contributing

Thanks for taking a look. A few rules keep this repository safe to be public.

## The one that matters most

**Never commit a secret.** This repository is public and MIT-licensed. Configuration lives in
environment files; only the `.env.example` templates are committed, and they contain placeholders
only. If you are unsure whether something is sensitive, it is — put it in an env file.

Before opening a PR, run:

```bash
git diff --cached | grep -nE '(mongodb(\+srv)?://[^:[:space:]]+:[^@[:space:]]+@|sk_live_|rzp_live_|AKIA[0-9A-Z]{12,}|-----BEGIN [A-Z ]*PRIVATE KEY-----)'
```

No output means you are fine. If it prints anything, stop and move it to an env file.

There is also a scanner you can run over the whole tracked tree:

```bash
node .verify/scan-secrets.mjs
```

## Setup

Each project is self-contained and has its own environment template. See the "Getting started"
section of the [README](README.md).

## Pull requests

- Keep a change focused. One concern per PR.
- Explain *why*, not just *what*.
- Do not reformat or restructure code you did not need to touch — it makes the real change
  impossible to review.
- If you change behaviour, say what could break.

## Reporting security issues

Do not open a public issue. See [SECURITY.md](SECURITY.md).
