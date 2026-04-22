# Plan: Implement Luxury Blank State and Snippet Gravity Sidebar

## Summary
Transform the empty state of list-based form sections (Work Experience, Education, Projects, etc.) from a simple "+ Add" button to a high-end "Skeleton UX". Update input placeholders to be directive and instructional. Introduce a "Snippet Gravity" sidebar for quick skill injections, and refine the rich text editor's empty state with a breathing AI suggestion button.

## Current State Analysis
- **Empty States:** List-based sections currently show a simple dashed "+ Add another [Section]" button when empty.
- **Placeholders:** Input placeholders are generic (e.g., "Senior Product Manager", "Tech Corp").
- **Rich Text Editor:** The `WYSIWYGEditor` has a fixed small height and generic placeholders.
- **AI Suggestion Button:** The ✨ Suggest button in the `WYSIWYGToolbar` is static.
- **Sidebar:** There is no sidebar for quick snippet insertion in the form view.

## Proposed Changes

### 1. `EmptyStateSkeleton` Component
- **File:** `src/components/ui/EmptyStateSkeleton.tsx` (New)
- **What/Why/How:** Create a reusable skeleton component for empty list states. It will display light gray rounded bars mimicking a filled entry, with a centered, high-contrast Lime Green "+" button and the micro-copy: "Add your first [item] to unlock career analytics."

### 2. Apply Skeletons to List-Based Sections
- **Files:** 
  - `src/components/forms/WorkExperienceSection.tsx`
  - `src/components/forms/EducationSection.tsx`
  - `src/components/forms/ProjectsSection.tsx`
  - `src/components/forms/VolunteerSection.tsx`
  - `src/components/forms/CertificatesSection.tsx`
  - `src/components/forms/PublicationsSection.tsx`
  - `src/components/forms/AwardsSection.tsx`
- **What/Why/How:** When `safeData.length === 0`, render the `EmptyStateSkeleton` instead of the basic "+ Add" button.

### 3. Contextual "Magic" Placeholders
- **Files:** Same form section files as above.
- **What/Why/How:** Update the `placeholder` props for all inputs and the `WYSIWYGEditor`.
  - **Work Experience:** Job Title `e.g., "Lead Solutions Architect"`, Company `e.g., "Global Tech Solutions"`, Summary `Start with a strong verb... (e.g., Orchestrated a cloud migration that reduced latency by 30%)`.
  - **Education:** Degree `e.g., "Master of Science"`, Field `e.g., "Computer Science"`, Institution `e.g., "Stanford University"`, Summary `Start with an achievement... (e.g., Graduated top 5% of class)`.
  - **Projects:** Name `e.g., "E-commerce Platform"`, Summary `Start with the impact... (e.g., Built a scalable backend serving 10k+ users)`.

### 4. Refine `WYSIWYGEditor` UI
- **Files:** `src/components/ui/WYSIWYGEditor.tsx`, `src/components/ui/WYSIWYGToolbar.tsx`, `src/app/globals.css`
- **What/Why/How:** 
  - Increase the default minimum height of the editor (e.g., `minHeight: '150px'`).
  - Add a custom `@keyframes breathe` to `globals.css` that scales from 1.0 to 1.05.
  - In `WYSIWYGToolbar.tsx`, apply the `animate-[breathe_2s_ease-in-out_infinite]` class to the ✨ Suggest button when the editor is completely empty.
  - Fade the toolbar to 50% opacity when the editor is not focused.

### 5. "Snippet Gravity" Sidebar
- **File:** `src/components/forms/SnippetGravitySidebar.tsx` (New), `src/components/forms/WorkExperienceSection.tsx`
- **What/Why/How:** Create a persistent right-hand panel that displays a "Recommended for you" stack of skill pills based on the current Job Title. When a user clicks a pill, it appends the text to the `summary` field of that work experience entry. Integrate this sidebar into the `SortableWorkItem` layout using a flex/grid structure (hidden on smaller screens, visible on desktop).

## Assumptions & Decisions
- The Skeleton Empty State will replace the existing "+ Add" button *only* when the list is completely empty. The "+ Add another" button will still appear below existing items.
- The Snippet Gravity Sidebar will initially be implemented for the Work Experience section, as it relies heavily on the "Job Title" context to recommend relevant skills.
- Snippet insertion will intelligently append to the HTML content of the WYSIWYG editor (e.g., inserting before the closing `</p>` tag).

## Verification Steps
1. Open the Interactive CV Form and clear all entries in the Work Experience section. Verify the Skeleton Empty State appears with the lime green "+" button.
2. Click the "+" button and verify a new empty entry appears with the new Contextual Magic Placeholders.
3. Focus on the Description text area and verify the toolbar becomes 100% opaque, and the ✨ Suggest button pulses (breathes).
4. Type a Job Title (e.g., "Software Engineer") and verify the Snippet Gravity Sidebar on the right updates with relevant skills.
5. Click a recommended skill pill and verify it is appended to the Description text area.