# Admin Dashboard Redesign Plan

## Objective
Redesign the **Admin Dashboard** (`src/app/admin/dashboard/page.tsx` and related components) to match the visual theme of the attached "Donezo" template image. Ensure it uses real admin data, supports proper theming, and adopts the same side-navigation layout as the main app pages.

## 1. Layout & Navigation Consistency
- **Current State:** The admin dashboard uses a top-header with a horizontal tab layout and hardcoded dark mode (`bg-gray-900`).
- **New State:** 
  - Refactor `src/app/admin/dashboard/page.tsx` to use a **Sidebar Layout** consistent with the main app (similar to `OptimizedDashboardLayout.tsx`).
  - The sidebar will contain the admin navigation links: Overview, Analytics, User Management, Content, Settings, etc.
  - This satisfies the requirement to "make sure the app pages and subpages navigation is same".

## 2. Theme & Styling Updates
- **Remove Hardcoded Dark Mode:** Strip out `bg-gray-900`, `text-white`, `bg-gray-800` classes across admin components (`AdminKPIs.tsx`, `UserManagement.tsx`, etc.).
- **Apply New Theme:** Use the light/clean aesthetic from the image with dark green (`#185b3a`), mint/lime accents, soft off-white/gray backgrounds (`bg-[#f3f2ee]`), and modern rounded corners (`rounded-2xl`, `rounded-3xl`).
- **Better Theme Support:** Ensure all components use proper `dark:bg-gray-800 dark:text-white` classes so the admin dashboard seamlessly respects the global light/dark theme toggle, defaulting to the clean style in the image.

## 3. Dashboard Widgets Redesign (`AdminKPIs.tsx` & Overview)
Rebuild the "Overview" tab of the admin dashboard to mirror the image's layout using actual admin metrics (no handcoded values):
- **Top Row (4 KPI Cards):**
  - Card 1 (Dark Green): Total Users (matching "Total Projects").
  - Card 2 (White): Active Users.
  - Card 3 (White): Total CVs.
  - Card 4 (White): Total Jobs / AI Usage.
- **Middle Row:**
  - **Project Analytics (Bar Chart):** Replace with `AdminKPIs` area/bar chart showing User Growth or Activity over time.
  - **Reminders/Alerts:** Map to recent system alerts, pending support tickets, or recent activity (`RecentActivityPanel`).
- **Bottom Row:**
  - **Project Progress (Donut Chart):** Map to User Plan Breakdown (Free vs Pro vs Premium) or Application Status breakdown.
  - **Project List:** Map to the latest newly registered users or recent system logs.

## 4. Implementation Steps
1. **Refactor Admin Layout:** Create a sidebar navigation for the admin area, moving the current `Tabs` into a vertical menu.
2. **Update Theme Classes:** Globally search and replace forced dark mode classes in admin components with proper theme-aware utility classes.
3. **Redesign `AdminKPIs`:** Rebuild the KPI cards, charts, and layout to match the CSS grid and visual style of the attached image.
4. **Integrate Real Data:** Ensure `fetchKPIData()`, `fetchChartData()`, and `fetchActivities()` correctly feed into the new UI components.

## Approval
Please review this updated plan for the Admin Dashboard. Let me know if you approve or if you'd like to adjust which admin metrics map to the specific widgets in the image!