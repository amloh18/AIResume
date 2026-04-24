# Tasks
- [x] Task 1: Identify and Remove Unused Components and Scripts
  - [x] SubTask 1.1: Run a static analysis or manual deep check to identify unused exports, components (`.tsx`), and scripts (`.ts`) across the entire project.
  - [x] SubTask 1.2: Delete all unused legacy `.tsx` component files and `.ts` script files.
- [x] Task 2: Migrate to Latest Components
  - [x] SubTask 2.1: Identify pages or components still using old UI components.
  - [x] SubTask 2.2: Refactor these files to import and use the latest UI components from `src/components/ui/` or newer equivalents.
- [x] Task 3: Remove Hardcoded and Legacy Templates
  - [x] SubTask 3.1: Locate legacy templates in `src/lib/templates` that are superseded by `v2`.
  - [x] SubTask 3.2: Delete legacy hardcoded template files and clean up adapters if no longer needed.
- [x] Task 4: Fix LinkedIn Enhancer
  - [x] SubTask 4.1: Add dark theme CSS/Tailwind classes to the LinkedIn Enhancer page (`src/app/linkedin-enhancer/page.tsx` or related components).
  - [x] SubTask 4.2: Fix the routing logic (e.g., `router.back()` or `router.push('/dashboard')`) in the LinkedIn Enhancer page so it navigates to the dashboard.
- [x] Task 5: Deep Check and Verification
  - [x] SubTask 5.1: Run TypeScript compiler (`tsc --noEmit` or similar) to ensure no broken imports.
  - [x] SubTask 5.2: Fix any compilation or linting errors introduced by the cleanup.

# Task Dependencies
- [Task 3] depends on [Task 2] being completed to ensure no active references to legacy templates.
- [Task 5] depends on [Task 1], [Task 2], [Task 3], and [Task 4].
