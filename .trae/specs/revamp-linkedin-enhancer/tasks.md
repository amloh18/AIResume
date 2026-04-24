# Tasks

- [x] Task 1: Scaffold New Layouts & Split Contexts
  - [x] SubTask 1.1: Refactor `LinkedInEnhancerContext` into `EnhancerContext` (generation state, section states), `DashboardContext` (metrics, insights), and `ExtensionContext` (connection, injection status).
  - [x] SubTask 1.2: Update `LinkedInEnhancerContainer` to conditionally render either the new `LinkedInEnhancerDashboard` or `LinkedInEnhancementFlow`.
  - [x] SubTask 1.3: Implement the strict State Machine for sections (`ORIGINAL` -> `GENERATED` -> `ACCEPTED` -> `APPLIED`) within the `EnhancerContext`.

- [x] Task 2: Implement "Next Best Action" Dashboard View (Image 1)
  - [x] SubTask 2.1: Create `ProfileStrengthCard` showing current score, "Refresh Score" button, and a null state skeleton when no profile is imported.
  - [x] SubTask 2.2: Create `ProfileChecklistCard` showing completed/missing profile sections.
  - [x] SubTask 2.3: Create `AISummaryCard` showing metrics, and a null state banner ("Connect Extension to unlock metrics") when empty.
  - [x] SubTask 2.4: Create `TopRecommendationsCard` showing actionable "Next Best Actions" (e.g., "🚀 Improve your headline [Fix Now ->]") that route directly to the specific section in the Enhancement Flow.

- [x] Task 3: Implement Enhancement Flow - Header & Sidebars (Image 2)
  - [x] SubTask 3.1: Build the 3-step progress header with a "⚡ One-click optimize" Quick Mode toggle for auto-accepting high-confidence changes.
  - [x] SubTask 3.2: Build the left sidebar showing User Profile Info, Before/After Profile Strength gauges, and a dynamic Sections checklist.
  - [x] SubTask 3.3: Implement Progressive Disclosure for "AI Insights". Hide the right insights sidebar by default, adding a "Show Insights" toggle.
  - [x] SubTask 3.4: Add the "Ready to apply?" CTA block with granular control checkboxes (e.g., `[✓ Headline] [✗ Experience]`) to select exactly which sections get injected.

- [x] Task 4: Implement Enhancement Flow - Main Content Area
  - [x] SubTask 4.1: Redesign `LinkedInHeroCard` (Headline) to show side-by-side "Original" vs "AI Enhanced". Include a "Confidence Score" (e.g., 92%) and an inline "Why this change?" reasoning block.
  - [x] SubTask 4.2: Redesign `LinkedInAboutCard`, `LinkedInExperienceCard`, `LinkedInEducationCard`, and `LinkedInSkillsCard` to match the new layout with scores and reasoning.
  - [x] SubTask 4.3: Ensure the Accept/Edit/Regenerate buttons correctly trigger the new State Machine rules (Edit overrides Generated -> becomes Accepted).
  - [x] SubTask 4.4: Add robust error handling to each card (e.g., if AI generation fails, show a "Retry" button within the card). Add empty states for sections missing in the original LinkedIn profile.

- [x] Task 5: Implement Safe Mode Preview & Undo
  - [x] SubTask 5.1: Create `BrowserExtensionModal` explaining the 4-step process and explicitly stating that the extension acts as the bridge.
  - [x] SubTask 5.2: Add a "Preview on LinkedIn" button that opens LinkedIn with an overlay showing what will change before actual DOM injection.
  - [x] SubTask 5.3: Add a Success Feedback Loop ("🎉 Profile Updated") after applying, displaying a summary of improvements and an "Undo Changes" button linked to a Version History rollback.

- [x] Task 6: Final Wiring & Cleanup
  - [x] SubTask 6.1: Ensure all UI components are fully wired to the newly split Contexts (`EnhancerContext`, `DashboardContext`, `ExtensionContext`).
  - [x] SubTask 6.2: Verify no hardcoded values exist for critical state (use fallback/mock data only if actual data is unavailable, but structure it correctly through context).