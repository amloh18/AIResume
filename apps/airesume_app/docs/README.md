# Documentation

User-facing documentation for AIResume.

**Only the documents listed below are published.** `.gitignore` carries an allowlist for this
directory, so anything else under `docs/` — operational runbooks, architecture audits, phase reports,
incident records, implementation plans — is excluded from this repository by default. An internal
document that defaults to public is a leak; a public document that defaults to internal is a
two-second fix, so the default is internal.

| Document | What it covers |
| --- | --- |
| [App guide](app-guide.md) | What the product does — the BUILD → MATCH → TAILOR → APPLY → TRACK → LEARN journey, feature by feature. |
| [Self-hosting](self-hosting.md) | Running your own instance: prerequisites, Docker, background workers, and the operational gotchas. |
| [Configuration](configuration.md) | Every environment variable, what it does, and whether it is required. |

Repository-level documents live at the root:

- [README](../README.md) — what this repository is, and how the projects fit together.
- [SECURITY](../SECURITY.md) — the secrets policy, and what to do if one is exposed.
- [CONTRIBUTING](../CONTRIBUTING.md) — how to contribute.
- [CODE_OF_CONDUCT](../CODE_OF_CONDUCT.md)
- [CHANGELOG](../CHANGELOG.md)
- [LICENSE](../LICENSE) — MIT.

> **Note on internal documentation.** Operational runbooks, architecture audits, incident records and
> the engineering registers are **not** published here. They live in a separate private repository.
> If you are looking for deployment details for a specific instance, you will not find them — and
> that is deliberate.

## Adding a document

If you add a public document, name it explicitly in the `.gitignore` allowlist in the DOCS section —
otherwise the blanket `*.md` rule will drop it silently, with no error and no diff. That failure mode
has bitten this repository before: an entire `docs/` tree was once invisible to git for exactly this
reason.
