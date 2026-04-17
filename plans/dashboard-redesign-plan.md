# Dashboard Redesign Plan

## Objective
Update the main Dashboard (Analytics) page and the app navigation to match the visual theme of the provided "Donezo" template image, while using real CVCircle application data (no handcoded values). Ensure consistent navigation across all app pages.

## 1. Theme & Styling Updates
- **Colors:** Introduce the dark green (`#185b3a`), light mint/lime accents, and soft off-white/gray backgrounds (`#f8f9fa` or similar) from the image.
- **Typography & Shapes:** Use modern rounded corners (`rounded-2xl`, `rounded-3xl`), soft shadows, and clean sans-serif typography.

## 2. Navigation Update (`OptimizedNavigation.tsx`)
- Update the sidebar to match the structure shown in the image:
  - **MENU Group:** Dashboard, Resumes, Jobs Hub, Analytics.
  - **GENERAL Group:** Settings, Help, Logout.
- **Styling:**
  - Active states will use a pill shape with either a soft green background or bold dark text, matching the image.
  - Add a "Mobile App" styled promotional card at the bottom (or keep the existing Membership/Credit card but restyle it to match the dark green aesthetic).

## 3. Dashboard Main Content (`Analytics.tsx`)
Replace the existing layout with a CSS Grid layout mimicking the image:

### Top Row: 4 KPI Cards
Using data from `useDashboardData()`:
1. **Total Resumes (Dark Green Card):** Total CVs created, with a trend indicator.
2. **Cover Letters:** Total Cover Letters generated.
3. **Active Applications:** Jobs with status 'applied', 'interview', etc.
4. **Saved Jobs:** Jobs with status 'draft' or 'saved'.

### Middle Row: Analytics & Reminders
1. **Application Analytics (Bar Chart):** 
   - Replace the current progress chart with a clean, rounded bar chart showing applications/activity over the last 7 days.
   - Use dark green and light green alternating bars.
2. **Reminders:**
   - Display upcoming job deadlines or interviews using the `jobs` array (filtered by dates).
   - Style with a clean list and a prominent "View Details" button.

### Bottom Row: Progress, Team & Time Tracker
1. **Application Progress (Donut Chart):**
   - Break down job applications by status (Applied, Interview, Offer, Rejected).
   - Style with the thick, rounded donut chart segments shown in the image.
2. **Recent Activity / Jobs List:**
   - Replace the "Team Collaboration" and "Project" lists with a clean list of the 4-5 most recently updated job applications or recent CV edits.
3. **CV Health / Time Tracker (Dark Theme Card):**
   - A dark green stylized card showing the user's Master CV Health Score (or AI tokens saved/used) to match the "Time Tracker" aesthetic.

## 4. Implementation Steps
1. **Step 1:** Update global CSS variables or Tailwind config (if needed) to include the specific dark green and mint colors.
2. **Step 2:** Refactor `OptimizedNavigation.tsx` to match the new visual groupings and active states. Ensure `OptimizedDashboardLayout.tsx` seamlessly integrates this sidebar.
3. **Step 3:** Completely refactor `Analytics.tsx` to build the new grid layout.
4. **Step 4:** Integrate `useDashboardData` and the existing API endpoints (`/api/analytics/progress`, etc.) to feed real data into the Recharts components and KPI cards.
5. **Step 5:** Test responsive behavior to ensure the grid collapses gracefully on mobile devices.

## Approval
Please review this plan. Let me know if you want to adjust which specific CVCircle metrics map to which visual widget in the image, or if the current mapping is good to go!