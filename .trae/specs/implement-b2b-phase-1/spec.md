# B2B Phase 1: Explainable AI & Premium Dashboard Spec

## Why
To establish the core wedge for the B2B platform, we need to upgrade the scoring engine to provide "Explainable AI" using Google Gemini, integrate Stripe for pay-per-parse billing, and elevate the HR Dashboard with a premium, glassmorphism-based UI/UX. This roadmap will be documented in a detailed `b2bplan.md`.

## What Changes
- Create `b2bplan.md` with the full 4-phase roadmap.
- Update `/api/v1/b2b/score` to use Google Gemini for generating an `analysis_summary` explaining the score.
- Integrate Stripe billing tied to API usage volume.
- Refactor the B2B Dashboard (Smart Roster, Sandbox) with glassmorphism elements and flat illustrations.

## Impact
- Affected specs: B2B Gateway, Billing, AI Scoring.
- Affected code: `b2bplan.md`, `src/app/api/v1/b2b/score/route.ts`, `src/app/b2b/dashboard/*`, billing services.

## ADDED Requirements
### Requirement: Detailed Roadmap
The system SHALL contain a detailed, well-thought-out `b2bplan.md` outlining all four phases.

### Requirement: Explainable AI
The B2B API scoring response SHALL include an `analysis_summary` array detailing exactly why points were awarded or deducted.

### Requirement: Usage Billing
The system SHALL integrate Stripe to charge tenants based on API usage volume (pay-per-parse).

### Requirement: Premium UI
The HR Dashboard SHALL use glassmorphism and flat startup illustrations to contrast heavily with clunky enterprise ATS interfaces.