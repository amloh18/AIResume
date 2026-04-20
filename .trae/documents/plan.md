# Implementation Plan for CV Builder UI/UX and AI Features

## 1. Header Text Visibility in Light Theme
**File:** `src/components/resume-enhancer/ResumeEnhancerContainer.tsx`
- **Issue:** The CV Title in the top app bar uses `text-white` which is invisible on light backgrounds.
- **Action:** Update the title `<span>` class to use `text-gray-900 dark:text-white` instead of `text-white`.

## 2. Replace Snippet Modal Centering
**File:** `src/components/cv-builder-pro/CVCanvasEngine.tsx`
- **Issue:** The modal is `fixed inset-0` but has a `z-50` index, placing it *under* the top app bar (`z-[100]`), which makes it look off-center.
- **Action:** Change the modal's z-index to `z-[110]` so it covers the header and centers correctly within the entire viewport.

## 3. Hide Contact Section in Header if in Sidebar
**Files:** `src/components/cv-builder-pro/components/CoreUI.tsx` and `src/components/cv-builder-pro/registry.tsx`
- **Issue:** Contact details duplicate when present in both header and sidebar.
- **Action:** 
  - In `CoreUI.tsx`, pass `activeTemplate` to `SnippetComponent.render` alongside `design`.
  - In `registry.tsx`, update header snippets (e.g., `header-minimal`, `header-split`) to check if `activeTemplate?.zones?.sidebar` (or left/right) includes `sidebar-contact`. If true, do not render `ContactLinks`.

## 4. Add Round Border Pill Shaped Skills
**File:** `src/components/cv-builder-pro/registry.tsx`
- **Issue:** The user requested pill-shaped skills.
- **Action:** Add a new snippet `skills-round-pills` to `SNIPPETS` which replicates `skills-pills` but replaces `rounded-md` with `rounded-full`. Update `CANVAS_TEMPLATES` to use this where appropriate or make it available in the library.

## 5. Show Snippets Preview for Empty CV Data
**File:** `src/components/cv-builder-pro/CVCanvasEngine.tsx`
- **Issue:** Snippet previews are blank if `cvData` is empty.
- **Action:** Create a `MOCK_CV_DATA` object with placeholder data. In the Add/Replace modal, deeply merge `cvData` with `MOCK_CV_DATA` (using mock data as a fallback for empty fields/arrays) and pass the merged object to the snippet's `render` function for the preview thumbnail.

## 6. Hide Existing Sections in "Add Section" Modal
**File:** `src/components/cv-builder-pro/CVCanvasEngine.tsx`
- **Issue:** Users shouldn't be able to add duplicate sections (e.g., two "Experience" sections).
- **Action:** When `replacingSnippet.isAdd` is true, calculate the active categories currently in the `zones` state. Filter the `SNIPPETS` array in the modal to exclude any snippet whose `category` is already present.

## 7. Make Section Hover Border Thin and Subtle
**File:** `src/components/cv-builder-pro/components/CoreUI.tsx`
- **Issue:** The hover border on sections is too thick.
- **Action:** Change the hover styles from `border-[2px]` to `border-[1px]` and adjust the hover border color to be more subtle (e.g., `group-hover/inner:border-blue-400/50`).

## 8. Page Gap Shadow Styling
**File:** `src/components/cv-builder-pro/CVCanvasEngine.tsx`
- **Issue:** The page gap is a solid grey bar.
- **Action:** Update the `repeating-linear-gradient` for `.cv-page-visualizer` to draw a subtle shadow (using `rgba(0,0,0,0.1)`) at the top and bottom of the page breaks, leaving the center of the gap transparent so the background shows through.

## 9 & 10. Robust AI Contextual Suggestion (STAR & Tone)
**Files:** 
- `src/components/cv-builder-pro/CVCanvasEngine.tsx`
- `src/app/api/ai/fix-and-improve/route.ts`
- **Issue:** Suggestions are hardcoded. Needs Tone Changer, STAR method, and robust plan limit handling.
- **Action:**
  - **API:** Update `/api/ai/fix-and-improve/route.ts` to check `usageLimitsService` (enforcing plan limits). Add support for a `tone` parameter in the prompt. Return a 402 status if limits are exhausted.
  - **UI:** In `CVCanvasEngine.tsx`, update `handleSuggestPoint` to capture the current text. Render a popup with a "Tone" dropdown and a "STAR Method" button. When clicked, set a loading state, call the API, and display the result. If a 402 is returned, show an "Upgrade Plan" message with a link.

## 11. AI Analysis Sidebar Light Theme Support
**File:** `src/components/resume-enhancer/panels/ATSMeterPanel.tsx`
- **Issue:** The AI Analysis sidebar uses hardcoded dark theme classes.
- **Action:** Refactor the container and inner elements to use Tailwind's `dark:` modifier (e.g., `bg-white dark:bg-[#11140e]`, `text-gray-900 dark:text-white`, `border-gray-200 dark:border-white/5`) to support both light and dark themes.