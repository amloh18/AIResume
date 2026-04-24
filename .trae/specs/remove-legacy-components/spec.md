# App Cleanup & LinkedIn Enhancer Fixes Spec

## Why
1. **Cleanup:** Over time, the application has accumulated unused components, legacy templates, and hardcoded structures. Cleaning up these outdated files will reduce bundle size and improve maintainability.
2. **LinkedIn Enhancer:** The LinkedIn Enhancer page lacks dark theme support, and its routing is broken (pressing back takes the user to sign-in instead of the dashboard). These need to be fixed for better UX and consistency.

## What Changes
- Scan the entire project (including `src/components`, `src/lib`, `src/app`, `src/hooks`, etc.) for unused or deprecated components, scripts (`.ts`), and `.tsx` files.
- Delete all unused scripts and `.tsx` files that are identified as legacy or no longer imported.
- Identify and remove hardcoded legacy templates (e.g., in `src/lib/templates/`).
- Update imports to use the latest created components where old ones are referenced.
- Implement dark theme support in the LinkedIn Enhancer page (`src/app/linkedin-enhancer/page.tsx` or its components).
- Fix the routing issue on the LinkedIn Enhancer page so that the back action correctly navigates to the dashboard instead of sign-in.
- Perform a "deep check" to ensure no broken links or missing imports remain.

## Impact
- Affected specs: Codebase cleanup, UI component standardization, and LinkedIn Enhancer UX.
- Affected code: `src/components/*`, `src/lib/templates/*`, various pages in `src/app/*`, and `src/app/linkedin-enhancer/page.tsx`.

## ADDED Requirements
### Requirement: LinkedIn Enhancer Dark Theme & Routing
The system SHALL support dark theme in the LinkedIn Enhancer and route correctly back to the dashboard.

#### Scenario: Success case
- **WHEN** a user with dark theme opens the LinkedIn Enhancer
- **THEN** the UI renders correctly in dark mode.
- **WHEN** the user presses the back button or navigates back from the LinkedIn Enhancer
- **THEN** they are taken to the dashboard, not the sign-in page.

## REMOVED Requirements
### Requirement: Legacy Templates & Components
**Reason**: They cause maintenance overhead, confusion, and bloat.
**Migration**: Replace references to legacy components with their newer counterparts and delete the old files.
