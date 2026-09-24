# UI Information Enhancement Plan

## Current Dashboard Structure

```
Greeting
├── KPI Strip (6 metrics)
├── TopJobMatchesSection
├── FreshMatchesWidget
└── Two-Column Layout
    ├── Left (2/3)
    │   ├── MyCvsPanel
    │   └── RecentJobsPanel
    └── Right (1/3)
        ├── UpgradeSuggestionCard
        ├── ContinuePanel
        └── ProfileAnalyticsPanel
```

## Enhancement Strategy

**Principle**: SAME STRUCTURE + MORE INTELLIGENCE

### 1. KPI Strip Enhancements

| Current | Enhancement |
|---------|-------------|
| Total CVs: 12 | Total CVs: 12 |
| Active Jobs: 47 | Active Jobs: 47 (3 fresh today) |
| Applications: 24 | Applications: 24 (3 awaiting input) |
| Interviews: 5 | Interviews: 5 |
| Avg Match: 82% | Avg Match: 82% (12 strong matches) |
| Usage: 8/10 | Usage: 8/10 |

### 2. FreshMatchesWidget Enhancements

Current shows: Title, Company, Location, Freshness, Match

Add:
- Employment type badge
- Salary (when available)
- Source badge
- Quick skill tags
- Application readiness indicator

### 3. ContinueJobCard Enhancements

Current shows: Title, Company, Location, Status, Action

Add:
- Freshness indicator (if < 24h)
- Match score badge
- Application readiness status
- Watchlist indicator (if target company)

### 4. New: NeedsAttentionPanel

Compact section showing items requiring user action:
- Applications needing input
- CAPTCHAs detected
- Failed automations
- Unanswered questions

### 5. ProfileAnalyticsPanel Enhancements

Add below radar chart:
- Skills matched to recent jobs
- Optimization opportunities
- ATS score trend

## Implementation Order

1. Enhance KPI Strip with fresh jobs count
2. Enhance FreshMatchesWidget with more metadata
3. Enhance ContinueJobCard with match/freshness
4. Create NeedsAttentionPanel
5. Add target company indicators

## Components to Modify

- `src/components/dashboard/redesigned/RedesignedDashboardView.tsx`
- `src/components/dashboard/redesigned/FreshMatchesWidget.tsx`
- `src/components/dashboard/redesigned/TopJobMatchesSection.tsx`

## Components to Create

- `src/components/dashboard/redesigned/NeedsAttentionWidget.tsx`

## Design Tokens

Reuse existing:
- Colors: emerald (success), amber (warning), rose (error), blue (info)
- Badges: `inline-flex items-center rounded-full bg-...`
- Text: `text-[11px]`, `text-xs`, `text-sm`
- Spacing: `gap-2`, `gap-3`, `mt-2`, `px-2`, `py-0.5`

## Mobile Behavior

- KPI strip: 2-col → 3-col → 6-col (existing)
- FreshMatchesWidget: Horizontal scroll (existing)
- ContinueJobCard: Single column (existing)
- NeedsAttentionPanel: Collapsible on mobile
