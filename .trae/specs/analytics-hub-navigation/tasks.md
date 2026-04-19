# Tasks
- [x] Task 1: Update Sidebar to Collapsed Mode by Default.
  - [x] SubTask 1.1: Modify `OptimizedDashboardLayout.tsx` and `OptimizedNavigation.tsx` to default to the icon-only "tablet" state for the sidebar on desktop screens.
  - [x] SubTask 1.2: Ensure the CVCircle logo acts as a universal home button, routing back to `/dashboard`.
- [x] Task 2: Implement `Cmd + K` Global Search.
  - [x] SubTask 2.1: Update `GlobalSearchBar.tsx` with a `useEffect` listener for `Cmd+K` or `Ctrl+K` to focus the search input automatically.
- [x] Task 3: Redesign Dashboard (Analytics) Landing Page.
  - [x] SubTask 3.1: Modify `src/app/dashboard/page.tsx` (or equivalent Analytics page) to implement the Z-Pattern layout.
  - [x] SubTask 3.2: Remove top "Tracker | Documents | Analytics" tabs if they exist on the dashboard page.
  - [x] SubTask 3.3: Add Personalized Greeting and a single "Resume Health" score header.
  - [x] SubTask 3.4: Build the Primary Hub grid with 3 glass-morphic cards: CV Editor, Job Tracker, Doc Center (using specific micro-copy and CTAs like "Fix CV Issues" or "Open Editor").
  - [x] SubTask 3.5: Ensure Progress Tracking and Application Stats remain prominent in the center.
  - [x] SubTask 3.6: Add Secondary Hub for utilities like LinkedIn Enhancer and Interview Coach.
- [x] Task 4: Add Breadcrumbs to Deep Work Views.
  - [x] SubTask 4.1: Implement a subtle breadcrumb component in `PageHeader.tsx` (or deep work layouts like Tracker and Editor) to show the path (e.g., `Dashboard > Tracker`).

# Task Dependencies
- [Task 3] depends on [Task 1] (Sidebar must be collapsed to ensure the Dashboard looks right).
- [Task 4] depends on [Task 1] (Breadcrumbs provide the navigation context when deep in a tool).
