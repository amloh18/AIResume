# CV Builder Enhancement Plan

## Overview
Comprehensive enhancement of the CV builder covering section hover/chip UI, drag-and-drop with animated drop indicators, AI-powered bullet point generation, snippet system for section design variants, cross-section formatting consistency, and Professional Extended template fixes.

## Key Architectural Decisions

1. **Section UI = Separate overlay system** — NOT wiring up TipTap NodeViews. The hover chip, action buttons, and drag handles are DOM overlays positioned over the existing ProseMirror-rendered HTML. This avoids rewriting the extension layer.

2. **AI bullets = Existing AI service** — Reuse `/api/ai/generate-suggestions` or `/api/ai/section-generate` endpoints. The existing `callGeminiWithAllKeysFallback()` utility with `gemini-2.5-flash-lite` model handles key rotation and fallback.

3. **Snippets = Separate React components** — Each snippet variant (skills-inline, skills-tags, skills-bars, etc.) is its own React component. Template renderers switch between snippet components based on `snippetOverrides`.

---

## Phase 1: Foundation — Types, Snippet Registry, State Management

### 1.1 Snippet Type System
**Files:** `src/types/snippets.ts` (new)

Define the snippet system architecture:

```ts
// Snippet categories — which section type the snippet applies to
type SnippetCategory = 'skills' | 'dates' | 'section-title' | 'summary' | 'basic';

// Each snippet is a render variant for a category
interface SnippetDefinition {
  id: string;                    // e.g., 'skills-inline', 'skills-tags', 'skills-bars'
  category: SnippetCategory;
  name: string;                  // Display name
  icon?: string;
  renderComponent?: string;      // Key into a component registry
  css?: string;                  // Inline CSS override
  config?: Record<string, any>;  // Snippet-specific configuration
  compatibleLayouts: LayoutType[]; // ['one-column', 'two-column', ...]
}

// Active snippets stored per-document
interface SnippetOverrides {
  skills?: string;        // snippet ID
  dates?: string;         // snippet ID
  sectionTitle?: string;  // snippet ID
  summary?: string;       // snippet ID
  basic?: string;         // snippet ID
}
```

**Key decisions:**
- Snippets are **section-level design overrides** — they change how a section renders without changing data
- Date snippet applies globally across ALL sections (format consistency)
- Section title snippet applies globally to ALL section titles
- One-column and two-column templates are NOT inter-transferable (snippets must declare `compatibleLayouts`)
- Snippets are stored on the `UnifiedCVDataStructure` as `snippetOverrides?: SnippetOverrides`

### 1.2 Snippet Registry
**Files:** `src/lib/snippets/snippet-registry.ts` (new)

Create a registry of available snippets per category. Each snippet variant is a **separate React component**:

**Skills snippet components (Professional Extended compatible):**
- `SkillsInlineSnippet` — "Category: skill1, skill2, skill3" (current Professional Extended style)
- `SkillsTagsSnippet` — Pill-shaped tags grouped by category
- `SkillsBarsSnippet` — Category with progress bars
- `SkillsColumnsSnippet` — Multi-column skill grid

**Date format snippet components:**
- `DateMMMYYYY` — "Jan 2024 - Present" (current default, maps to `DateFormatStyle: 'MMM_YYYY'`)
- `DateMMYYYY` — "01/2024 - Present" (maps to `MM_YYYY`)
- `DateFull` — "January 2024 - Present" (new, maps to full month name)
- `DateISO` — "2024-01 - Present" (maps to ISO format)

**Section title snippet components:**
- `TitleBorderedSnippet` — Uppercase with bottom border (current Professional Extended)
- `TitleMinimalSnippet` — Plain uppercase, no border
- `TitleAccentSnippet` — With left accent bar
- `TitleSpacedSnippet` — With decorative line after text

**Summary snippet components:**
- `SummaryJustifiedSnippet` — Justified text block (current Professional Extended)
- `SummarySpacedSnippet` — With paragraph spacing
- `SummaryHighlightedSnippet` — With highlighted key phrases

**Basic section snippet components (contact display):**
- `BasicInlineBarSnippet` — "email | phone | linkedin | location" with icons (Professional Extended header)
- `BasicStackedSnippet` — Vertical list with icons
- `BasicMinimalSnippet` — Text only, no icons

**Registry pattern:**
```ts
const SNIPPET_REGISTRY: Record<SnippetCategory, SnippetDefinition[]> = {
  skills: [
    { id: 'skills-inline', component: SkillsInlineSnippet, name: 'Inline', compatibleLayouts: ['two-column', 'one-column'], ... },
    { id: 'skills-tags', component: SkillsTagsSnippet, name: 'Tags', compatibleLayouts: ['one-column'], ... },
    // ...
  ],
  dates: [ ... ],
  sectionTitle: [ ... ],
  summary: [ ... ],
  basic: [ ... ],
};
```

### 1.3 State Management
**Files:** `src/lib/stores/snippetStore.ts` (new)

Zustand store for snippet state:
```ts
interface SnippetStore {
  activeSnippets: SnippetOverrides;           // Current active snippets
  availableSnippets: Record<SnippetCategory, SnippetDefinition[]>;
  
  // Actions
  setSnippet: (category: SnippetCategory, snippetId: string) => void;
  clearSnippet: (category: SnippetCategory) => void;
  clearAllSnippets: () => void;
  getSnippetsForLayout: (layout: LayoutType) => SnippetDefinition[];
  isSnippetCompatible: (snippetId: string, layout: LayoutType) => boolean;
}
```

---

## Phase 2: Section Hover Chip UI & Drag-and-Drop

### 2.1 SectionHoverChip Component (Overlay System)
**Files:** `src/components/editor/SectionHoverChip.tsx` (new)

**Architecture:** Separate overlay system — NOT connected to TipTap NodeViews. The overlay layer:
1. Tracks section boundaries via DOM queries (`[data-section-id]` elements from rendered HTML)
2. Positions a floating chip relative to the hovered section's bounding rect
3. Listens to `mouseover`/`mouseout` events on section containers
4. Uses `position: absolute` relative to the editor container

**Chip contents:**
- Section name label (e.g., "Experience", "Education", "Skills")
- "+" button to add new entry to that section
- Drag handle (GripVertical icon) for drag-and-drop reordering
- Snippet icon (Palette/Wand icon) when snippets are available for that section type
- Trash icon to delete section

**Implementation:**
- Component reads editor DOM for section elements and their bounding rects
- On `mouseover` of a section element → calculate position → render chip at `top: sectionRect.top - chipHeight - 4px, left: sectionRect.left`
- Animate in/out with Framer Motion (`AnimatePresence`, `motion.div`)
- Chip is `bg-gray-900 text-white` pill-shaped, with lime-green accent on "+" hover
- Haptic feedback: subtle scale animation on button press (`scale(0.95)`)
- Actions call TipTap editor commands via editor instance reference

### 2.2 Enhanced Hover States
**Files:** `src/components/editor/SectionHoverChip.tsx` (overlay manages hover states)

Since we're using a separate overlay system (not NodeViews), hover states are applied by the overlay component via CSS classes on the ProseMirror-rendered DOM elements.

**Implementation:**
- The overlay component adds/removes CSS classes on section DOM elements on hover
- On mouse enter: Add class `section-hover` → `background: rgba(0,0,0,0.02)` (very subtle gray tint)
- On mouse leave: Remove `section-hover` class
- Selected state: Detected via ProseMirror selection → Add `section-selected` class → `border-left: 3px solid #84cc16; background: rgba(132,204,22,0.05)`
- Transition: `transition: all 150ms ease` for haptic feel

**CSS injection:**
- Inject a `<style>` block into the editor container with the hover/selected styles
- Styles target `[data-section-id].section-hover` and `[data-section-id].section-selected`

### 2.3 Drag-and-Drop with Animated Drop Position
**Files:** Modify `src/components/editor/plugins/DragDropPlugin.ts`

Current state: Plugin creates decorative drag handles but has NO actual reordering logic.

**New implementation:**
1. **Drag state tracking**: Track `draggedNodeId` and `dragOverNodeId` in plugin state
2. **Drop position indicator**: Animated dashed line showing where the section will be dropped
   - Decoration: `Decoration.widget` rendering a horizontal line with lime-green color
   - Animation: CSS `@keyframes` for subtle pulse/shimmer effect
3. **Reorder logic**: On drop, use ProseMirror transactions to move the block node from source position to target position
4. **Visual feedback during drag**:
   - Dragged section: `opacity: 0.5`, slight scale down
   - Drop zones: Show animated indicator line
   - Smooth transition via CSS transitions

### 2.4 Action Chip Positioning (Outside Section)
**Files:** `src/components/editor/SectionHoverChip.tsx` (overlay component)

Since the overlay system is separate from the ProseMirror DOM, all action chips naturally live OUTSIDE the section area:

- The hover chip floats above the section (outside the section border)
- "+" button calls `editor.chain().focus().insertContent(...)` to add new entry
- Trash2 button calls the section node's delete command
- GripVertical → drag handle (triggers DragDropPlugin drag start)
- Palette icon → opens SnippetPicker popover

**No modifications needed to existing section components** — they're dead code (not connected to NodeViews). The overlay handles everything.

---

## Phase 3: AI-Powered Bullet Point Generation

### 3.1 AI Bullet Service
**Files:** `src/services/aiBulletService.ts` (new)

Service that generates a new bullet point based on context. Uses the EXISTING AI infrastructure:
- Calls `/api/ai/section-generate` (CAR-framework bullet rewriting) or `/api/ai/generate-suggestions` (8 variations)
- Server uses `callGeminiWithAllKeysFallback()` with `gemini-2.5-flash-lite` model
- Existing key rotation: `gemini_api_key2` → `gemini_api_key` → `gemini_api_key3`

**Client-side wrapper `aiBulletService`:**
```ts
// Calls existing API endpoint
async function generateBullet(context: {
  sectionType: 'experience' | 'education' | 'project';
  entryData: Record<string, any>;    // company, position, etc.
  existingBullets: string[];          // current bullet points
  profileSummary?: string;            // user's professional summary
}): Promise<string> {
  const response = await fetch('/api/ai/section-generate', {
    method: 'POST',
    body: JSON.stringify({ context, mode: 'generate-new' }),
  });
  return response.json();
}
```

**Prompt strategy:**
- Include the current entry's position/company/context
- Include all existing bullet points for that entry
- Include the user's profile/summary for context
- Ask for ONE new bullet point that complements existing points

### 3.2 "+" Icon AI Integration
**Files:** Modify `src/components/editor/ResumeEditor.tsx`, modify section components

**Flow:**
1. User clicks "+" on a bullet point (or at the end of bullet list)
2. Show loading state: Replace "+" with animated spinner (lime-green)
3. Call `aiBulletService.generateBullet(context)`
4. On success: Insert new `bulletNode` with generated text
5. On error: Fallback to empty bullet point (current behavior)
6. Remove loading state

**Loading state component:** Inline spinner using Framer Motion, lime-green color matching the brand.

### 3.3 Loading State for AI Generation
**Files:** `src/components/editor/AIGeneratingIndicator.tsx` (new)

Small inline loading indicator:
- Animated dots or shimmer effect
- Text: "Generating..." 
- Lime-green color
- Appears inline where the new bullet will be inserted
- Disappears when generation completes

---

## Phase 4: Snippet Selector UI

### 4.1 SnippetPicker Component
**Files:** `src/components/editor/SnippetPicker.tsx` (new)

Modal/popover that shows available snippets for a category:
- Opens when user clicks the snippet icon in the hover chip
- Shows thumbnail previews of each snippet variant
- Filters by compatible layouts (e.g., only show snippets compatible with current template's layout type)
- On select: Updates `snippetStore.activeSnippets[category]`
- Animated open/close with Framer Motion

### 4.2 Format Bar Snippet Setting
**Files:** Modify `src/components/editor/ResumeEditor.tsx` (BubbleMenu area)

Add a "Format" section to the BubbleMenu or a separate format toolbar:
- Date format selector (dropdown with preview)
- Toggle to show/hide icons in contact section
- Section title style selector
- These change global formatting across the document

### 4.3 Snippet Component Integration in Template Renderers
**Files:** Modify `src/lib/templates/custom-renderers/ProfessionalExtendedTemplate.tsx`

Each snippet is a separate React component. Template renderers conditionally render the appropriate snippet component:

```tsx
// In ProfessionalExtendedTemplate:
import { SkillsInlineSnippet, SkillsTagsSnippet, ... } from '@/lib/snippets/components';

// Skills section:
{(() => {
  const SnippetComponent = getSnippetComponent('skills', snippetOverrides?.skills);
  return <SnippetComponent skills={skills} />;
})()}
```

**Integration pattern:**
- Template receives `snippetOverrides?: SnippetOverrides` as a prop
- A `getSnippetComponent(category, snippetId)` utility returns the correct React component
- If no snippet override is set, the template uses its default component
- Dates use `DateFormatStyle` from format store (not a separate component — just a style parameter)
- Section titles have dedicated snippet components that wrap the title content

---

## Phase 5: Cross-Section Formatting Consistency

### 5.1 Global Format State
**Files:** `src/lib/stores/formatStore.ts` (new)

Zustand store for document-wide formatting:
```ts
interface FormatStore {
  dateFormat: DateFormatStyle;          // Applied to ALL dates
  sectionTitleStyle: SectionTitleStyle; // Applied to ALL section titles
  summaryStyle: SummaryStyle;           // Applied to ALL summary/description text
  showContactIcons: boolean;            // Show/hide icons in contact section
  
  setDateFormat: (style: DateFormatStyle) => void;
  setSectionTitleStyle: (style: SectionTitleStyle) => void;
  setSummaryStyle: (style: SummaryStyle) => void;
  setShowContactIcons: (show: boolean) => void;
}
```

**Key principle:** Changing a format type (e.g., date format) changes ALL instances of that type across the ENTIRE document for consistency.

### 5.2 Template Integration
**Files:** Modify template renderers

Template renderers read from `formatStore` instead of hardcoded values:
- `ProfessionalExtendedTemplate` reads `dateFormat` from store
- Section titles read `sectionTitleStyle` from store
- Summaries/descriptions read `summaryStyle` from store

---

## Phase 6: Professional Extended Template Fixes

### 6.1 Date Positioning Fix
**Files:** `src/lib/templates/custom-renderers/ProfessionalExtendedTemplate.tsx`

**Problem:** Dates are not positioning correctly. The `job-dates` class uses `white-space: nowrap` but is inside a flex container (`company-line`) with `flex-wrap: wrap`. When dates are long, they wrap awkwardly.

**Fix:**
- Change `.company-line` to use `display: flex; align-items: baseline; flex-wrap: nowrap;` and add `overflow: hidden; text-overflow: ellipsis;`
- Ensure `.job-dates` has proper `flex-shrink: 0` so it doesn't get compressed
- For education: `.edu-dates` should be a separate line below university, not inline (already is, but verify positioning)

### 6.2 Skills Format Fix
**Files:** `src/lib/templates/custom-renderers/ProfessionalExtendedTemplate.tsx`

Current: Skills render as `Category: skill1, skill2, skill3` (lines 581-598). This is ALREADY correct. The user wants this format to be one of the snippet options.

Verify the rendering is:
```
Programming: Python, JavaScript, TypeScript
Design: Figma, Adobe XD, Photoshop
```

### 6.3 Basic Section Contact Format
**Files:** `src/lib/templates/custom-renderers/ProfessionalExtendedTemplate.tsx`

**Current:** Header contact bar (lines 467-503) shows `email | phone | location | url` separated by `|` with SVG icons. This is ALREADY implemented.

**Additional requirement:** Add a setting in the main format bar to toggle icons on/off.
- Add `showContactIcons` to format store
- When `false`, render contact items without SVG icons
- When `true`, render with SVG icons (current behavior)
- Toggle button in format bar: `Eye`/`EyeOff` icon

---

## Phase 7: Edge Cases — Snippet + Template Switching

### 7.1 Template Switch Behavior
**Files:** Modify `src/lib/stores/templateStore.ts`, `src/components/templates/TemplateSwitcher.tsx`

**Edge cases to handle:**

1. **User has snippets set, switches to a template with different layout:**
   - If new template layout type is incompatible with current snippets (e.g., one-column → two-column), clear incompatible snippets
   - Show a toast: "Some section designs were reset because they're not compatible with the new template"
   - Keep compatible snippets (e.g., date format is layout-agnostic)

2. **User switches template, then changes snippet:**
   - New snippet should apply to the new template's rendering
   - No conflict — snippet just overrides the new template's default

3. **User changes snippet, then changes the same snippet again:**
   - Simple override — just replace the snippet ID

4. **Date format snippet + template has its own date format:**
   - Snippet ALWAYS wins (user's explicit choice overrides template defaults)

5. **Section title snippet across different section types:**
   - The snippet applies to ALL section titles (experience, education, skills, etc.)
   - If template has custom section title styling per section, the snippet replaces it uniformly

### 7.2 Layout Compatibility Check
**Files:** `src/lib/snippets/layout-compatibility.ts` (new)

```ts
function isSnippetCompatibleWithLayout(
  snippet: SnippetDefinition,
  layoutType: LayoutType
): boolean {
  return snippet.compatibleLayouts.includes(layoutType);
}

function getIncompatibleSnippets(
  snippets: SnippetOverrides,
  layoutType: LayoutType,
  registry: SnippetRegistry
): SnippetCategory[] {
  // Return categories where the active snippet is incompatible
}
```

### 7.3 Snippet Persistence
**Files:** Modify `src/types/unified-cv-schema.ts`

Add `snippetOverrides?: SnippetOverrides` to `UnifiedCVDataStructure`. This ensures snippets are saved with the CV data and persist across sessions.

---

## Implementation Order

1. **Phase 1** — Types, registry, stores (foundation, no UI changes)
2. **Phase 6** — Professional Extended template fixes (quick wins, independent)
3. **Phase 2** — Section hover chip + drag-and-drop (visual changes)
4. **Phase 3** — AI bullet generation (feature addition)
5. **Phase 5** — Cross-section formatting consistency (state + integration)
6. **Phase 4** — Snippet selector UI (builds on Phase 1 + 5)
7. **Phase 7** — Edge cases (builds on all above)

---

## Files to Create (New)

| File | Purpose |
|------|---------|
| `src/types/snippets.ts` | Snippet type definitions |
| `src/lib/snippets/snippet-registry.ts` | Snippet registry with all variants |
| `src/lib/snippets/layout-compatibility.ts` | Layout compatibility utilities |
| `src/lib/snippets/components/SkillsInlineSnippet.tsx` | Skills: Category: skill1, skill2 format |
| `src/lib/snippets/components/SkillsTagsSnippet.tsx` | Skills: pill-shaped tags |
| `src/lib/snippets/components/SkillsBarsSnippet.tsx` | Skills: progress bars |
| `src/lib/snippets/components/SkillsColumnsSnippet.tsx` | Skills: multi-column grid |
| `src/lib/snippets/components/TitleBorderedSnippet.tsx` | Section title: bordered |
| `src/lib/snippets/components/TitleMinimalSnippet.tsx` | Section title: minimal |
| `src/lib/snippets/components/TitleAccentSnippet.tsx` | Section title: accent bar |
| `src/lib/snippets/components/TitleSpacedSnippet.tsx` | Section title: spaced |
| `src/lib/snippets/components/SummaryJustifiedSnippet.tsx` | Summary: justified |
| `src/lib/snippets/components/SummarySpacedSnippet.tsx` | Summary: spaced |
| `src/lib/snippets/components/SummaryHighlightedSnippet.tsx` | Summary: highlighted |
| `src/lib/snippets/components/BasicInlineBarSnippet.tsx` | Contact: inline with icons |
| `src/lib/snippets/components/BasicStackedSnippet.tsx` | Contact: stacked |
| `src/lib/snippets/components/BasicMinimalSnippet.tsx` | Contact: text only |
| `src/lib/snippets/components/index.ts` | Barrel export |
| `src/lib/stores/snippetStore.ts` | Zustand store for snippet state |
| `src/lib/stores/formatStore.ts` | Zustand store for global formatting |
| `src/components/editor/SectionHoverChip.tsx` | Floating overlay chip on section hover |
| `src/components/editor/SnippetPicker.tsx` | Snippet selection modal/popover |
| `src/components/editor/AIGeneratingIndicator.tsx` | Loading state for AI generation |
| `src/services/aiBulletService.ts` | AI bullet point generation wrapper |

## Files to Modify (Existing)

| File | Changes |
|------|---------|
| `src/types/unified-cv-schema.ts` | Add `snippetOverrides` field |
| `src/components/editor/ResumeEditor.tsx` | Integrate SectionHoverChip overlay, format bar additions, AI integration |
| `src/components/editor/plugins/DragDropPlugin.ts` | Full drag-drop with reorder + animated drop indicator |
| `src/lib/templates/custom-renderers/ProfessionalExtendedTemplate.tsx` | Date fix, snippet component integration, contact icon toggle |
| `src/components/templates/TemplateSwitcher.tsx` | Edge case handling on template switch |
| `src/lib/utils/textFormatting.ts` | Add new date format styles (full month name) |

**Note:** Existing section components (`ExperienceSection.tsx`, etc.) are NOT modified — they're dead code (not connected to NodeViews). The overlay system handles all section interactions.

---

## Verification Steps

1. **Hover states**: Hover each section type → verify subtle gray background + chip appears
2. **Drag-and-drop**: Drag a section → verify animated drop indicator → drop → verify order changes
3. **AI bullet**: Click "+" → verify loading spinner → verify generated bullet point appears
4. **Snippet switching**: Open snippet picker for skills → select different snippet → verify render changes
5. **Date format**: Change date format in format bar → verify ALL dates across document update
6. **Section title**: Change section title style → verify ALL section titles update
7. **Contact icons**: Toggle contact icons off → verify icons disappear from Professional Extended header
8. **Template switch with snippets**: Set snippets → switch template → verify incompatible snippets cleared
9. **Professional Extended dates**: Verify dates render correctly inline with company name
10. **Professional Extended skills**: Verify "Category: skill1, skill2, skill3" format
