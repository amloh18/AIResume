# Analytics Hub Navigation Spec

## Why
Making the Analytics dashboard the first thing a user sees shifts the app from being a "static editor" to a "career command center." However, completely removing the sidebar creates cognitive load and makes users feel "trapped." We need a "Focused Sidebar" compromise—a collapsible mini-sidebar that maintains the Glassmorphism aesthetic and gives the dashboard 90% of the screen real estate while keeping tools one click away.

## What Changes
- **Collapsible Mini-Sidebar:** On login, the sidebar collapses into thin icons by default (utilizing the existing tablet screen behavior) to maximize screen space for the dashboard.
- **Dashboard Information Architecture (Z-Pattern):**
  - **Header:** Personalized Greeting ("Welcome back, [Name]") and a single "Resume Health" score.
  - **Primary Hub (Launchpad):** 3 large glass-morphic tool cards (CV Editor, Job Tracker, Doc Center) with micro-copy and direct CTAs (e.g., "Fix CV Issues").
  - **Data Core:** Keep the Progress Tracking and Application Stats charts prominent in the center.
  - **Secondary Hub:** Smaller list/grid for utilities like "LinkedIn Enhancer" and "Interview Coach."
- **The 'Command Bar':** Implement a `Cmd + K` (or `Ctrl + K`) global keyboard shortcut to focus the existing search bar, allowing power users to jump instantly to tools without touching the mouse.
- **Breadcrumb Safety Net:** Add a subtle top-bar breadcrumb (e.g., `Analytics > Editor`) in "Deep Work" views (like the Tracker or Editor) to ensure users always know exactly where they are in the hierarchy.
- **Universal Home:** The CVCircle Logo acts as a universal home button, returning the user to the Analytics Dashboard from any tool.

## Impact
- Affected specs: Navigation, Dashboard Layout, Global Search, Deep Work Views (Tracker, Editor).
- Affected code: `OptimizedDashboardLayout.tsx`, `OptimizedNavigation.tsx`, `GlobalSearchBar.tsx`, `PageHeader.tsx`, `src/app/dashboard/page.tsx` (Analytics Dashboard).

## ADDED Requirements
### Requirement: Dashboard Launchpad
The system SHALL provide a centralized "Launchpad" on the main Analytics Dashboard.

#### Scenario: Success case
- **WHEN** user logs in or clicks the CVCircle Logo
- **THEN** they land on the Analytics Dashboard, the sidebar is collapsed to icons, and the Primary Hub (Editor, Tracker, Doc Center cards) is immediately visible.

### Requirement: Command Bar Shortcut
The system SHALL provide a global keyboard shortcut to focus the search bar.

#### Scenario: Success case
- **WHEN** user presses `Cmd + K` or `Ctrl + K`
- **THEN** the Global Search Bar input is focused, ready for typing.

## MODIFIED Requirements
### Requirement: Collapsible Sidebar
The sidebar SHALL be collapsed by default on desktop, showing only icons, to maximize the dashboard's screen real estate, utilizing the existing tablet-screen collapsed state logic.

### Requirement: Deep Work Breadcrumbs
Deep work views (e.g., Tracker, Editor) SHALL display a breadcrumb trail (e.g., `Dashboard > Tracker`) in the top header to prevent users from feeling trapped.
