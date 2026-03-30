# CV Layout Rules — Hybrid Enforcement System

## Executive Summary

Implement a **Policy vs. Enforcement** architecture for CV formatting rules in CVCircle. This system ensures that regardless of how much (or how little) text a user enters, the layout remains balanced, scannable, and ATS-compliant. Rules are defined once in a **Shared Schema**, then consumed by both the **Template Layer** (Enforcer) and the **Preview Layer** (Validator).

---

## Architecture: Policy vs. Enforcement

```
┌─────────────────────────────────────────────────────────────┐
│                    SHARED SCHEMA                            │
│  src/lib/validation/cv-layout-rules.ts                     │
│  • Section format rules (bullets, paragraphs, tags)        │
│  • Typography hierarchy (font sizes, weights, casing)      │
│  • Layout constraints (no-wrap, vertical rhythm)           │
│  • Content limits (max chars, max bullets)                 │
│  • Edge case rules (empty states, URL shortening)          │
└──────────────────────────┬──────────────────────────────────┘
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
┌──────────────────────┐   ┌──────────────────────────┐
│  TEMPLATE (Enforcer) │   │  PREVIEW (Validator)     │
│                      │   │                          │
│  • CSS enforcement   │   │  • Real-time warnings    │
│  • HTML structure    │   │  • Content formatting    │
│  • Page break logic  │   │  • Visual feedback       │
│  • Empty state hide  │   │  • Character counters    │
│  • PDF generation    │   │  • Formatting prompts    │
│                      │   │  • Input constraints     │
└──────────────────────┘   └──────────────────────────┘
```

---

## Current State Analysis

### What Exists
- **Template rendering**: `TemplateRenderer` + `COMPONENT_REGISTRY` + 12+ hardcoded custom renderers
- **CV section components**: `WorkExperience.tsx`, `Profile.tsx`, `Education.tsx`, `Skills.tsx` with inline CSS
- **Validation**: `cv-schemas.ts` (Zod schemas for data integrity only — no layout rules)
- **Preview**: `BuilderPreview.tsx` with `contentEditable` inline editing, `LivePreview.tsx` for read-only
- **Text formatting**: `textFormatting.ts` with `renderFormattedText()`, `formatDateRange()`

### What's Missing
1. **Shared layout rules config** — No centralized definition of CV formatting rules
2. **Preview validation engine** — No real-time warnings for content quality
3. **Template CSS enforcement** — Inconsistent `break-inside: avoid`, no orphan/widow handling
4. **Content-type constraints** — No enforcement of "profile = paragraph" vs "experience = bullets"
5. **Empty state handling** — Separators shown even when fields are empty (e.g., `Google | | Mountain View`)
6. **Vertical rhythm** — No consistent 2x spacing ratio between sections vs items

---

## Implementation Plan

### Phase 1: Shared Layout Rules Schema

**Goal:** Define all CV formatting rules in a single, type-safe configuration file.

**File:** `src/lib/validation/cv-layout-rules.ts`

```typescript
// ─── CONTENT-TYPE RULES ───────────────────────────────────

interface SectionFormatRule {
  sectionType: string;
  format: 'paragraph' | 'bullets' | 'inline-tags' | 'multi-line-stack' | 'compact-grid';
  constraints: {
    maxCharacters?: number;
    maxLines?: number;
    maxBullets?: number;
    maxWordsPerItem?: number;
    requireActionVerb?: boolean;
  };
  displayAs: 'p' | 'ul' | 'inline-pills' | 'stack';
}

// ─── LAYOUT RULES ─────────────────────────────────────────

interface LayoutRules {
  // The "Golden" Layout Rules
  dateTitleAnchor: {
    enabled: boolean;
    container: 'flex-justify-space-between';
    dateContainer: { whiteSpace: 'nowrap' };
    titleTruncation: 'ellipsis' | 'wrap';
  };
  
  twoThirdsRule: {
    enabled: boolean;
    maxWidth: '75%';
  };
  
  verticalRhythm: {
    sectionSpacing: string;   // e.g., '24px'
    itemSpacing: string;      // e.g., '12px' (section = 2× item)
    ratio: number;            // 2.0
  };
  
  // Header & Contact
  contactInfo: {
    format: 'single-line' | 'compact-grid';
    separator: 'pipe' | 'dot' | 'icon';
    noWrapFields: string[];   // ['email', 'url']
    truncateStrategy: 'hyperlink' | 'shorten';
  };
  
  // Date handling
  dateRules: {
    noWrap: boolean;
    useNonBreakingSpace: boolean;
    format: 'MMM YYYY' | 'MM/YYYY' | 'YYYY';
  };
  
  // Page break rules
  pageBreaks: {
    preventOrphanedHeaders: boolean;  // break-after: avoid on h2
    preventSplitEntries: boolean;     // break-inside: avoid on entry blocks
    minContentOnPage2: number;        // min items before page break
  };
  
  // Orphan/Widow prevention
  orphanPrevention: {
    enabled: boolean;
    minWordsOnLastLine: number;       // 2
    strategy: 'widows-css' | 'letter-spacing' | 'nbsp';
  };
}

// ─── TYPOGRAPHY RULES ─────────────────────────────────────

interface TypographyRules {
  hierarchy: {
    sectionHeading: { fontSize: '12-14pt', fontWeight: 'bold', casing: 'uppercase' };
    jobTitle:       { fontSize: '10-11pt', fontWeight: 'bold', casing: 'none' };
    companyDate:    { fontSize: '10pt',    fontWeight: 'italic|medium', casing: 'none' };
    bodyText:       { fontSize: '9-10pt',  fontWeight: 'regular', casing: 'none' };
  };
  
  sectionHeaderConsistency: {
    enforceSameSize: boolean;
    enforceSameWeight: boolean;
    enforceSameCasing: 'uppercase' | 'title-case' | 'none';
  };
}

// ─── EDGE CASE RULES ──────────────────────────────────────

interface EdgeCaseRules {
  emptyStates: {
    hideEmptyFields: boolean;
    hideSurroundingSeparators: boolean;  // Never show "Google | | Mountain View"
    hideEmptyGPA: boolean;
    hideEmptyLocation: boolean;
  };
  
  urlHandling: {
    shortenLongURLs: boolean;
    maxDisplayLength: number;            // e.g., 30 chars
    displayAs: 'domain/path' | 'custom-text' | 'full';
  };
  
  skillsFormatting: {
    maxWordsPerSkill: number;            // 3
    grouping: 'by-category' | 'flat';
    displayAs: 'comma-separated' | 'pills' | 'list';
  };
}
```

**Tasks:**
- [ ] Create `src/lib/validation/cv-layout-rules.ts` with all interfaces and default rules
- [ ] Create `src/lib/validation/default-rules.ts` with production-ready default values
- [ ] Export rule objects for consumption by template and preview layers
- [ ] Add rule validation (ensure ratios are correct, spacing values are valid CSS)

---

### Phase 2: Template Layer Enforcement (CSS + Structure)

**Goal:** Enforce structural rules at the template/component level so the final PDF is always correct.

#### 2.1 Update CV Section Components

**Files to modify:**
- `src/components/cv-sections/WorkExperience.tsx`
- `src/components/cv-sections/Education.tsx`
- `src/components/cv-sections/Profile.tsx`
- `src/components/cv-sections/Skills.tsx`
- `src/components/cv-sections/PersonalHeader.tsx`
- `src/components/cv-sections/Projects.tsx`

**Changes:**

**a) Date-Title Anchor (All entry-based sections)**
```css
/* Current: basic flex */
.item-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

/* Updated: enforce no-wrap on dates, truncation on titles */
.item-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 16px;
}

.item-date-group {
  white-space: nowrap;           /* CRITICAL: Never wrap dates */
  flex-shrink: 0;                /* Don't compress dates */
}

.item-title-group {
  flex: 1;
  min-width: 0;                  /* Enable text truncation */
  overflow: hidden;
  text-overflow: ellipsis;       /* Show "..." if title too long */
}
```

**b) Two-Thirds Rule (Bullet points/descriptions)**
```css
.item-summary, .item-highlights {
  max-width: 75%;                /* Create ragged right margin */
}
```

**c) Page Break Enforcement**
```css
@media print {
  .section-header {
    break-after: avoid;          /* Never orphan section header */
  }
  .experience-item, .education-item, .project-item {
    break-inside: avoid;         /* Never split an entry */
  }
  .section-content {
    break-before: auto;
  }
}
```

**d) Vertical Rhythm**
```css
.section-content {
  margin-bottom: 24px;           /* Section spacing */
}

.experience-list {
  display: flex;
  flex-direction: column;
  gap: 12px;                     /* Item spacing (24/12 = 2x ratio) */
}
```

**e) Empty State Handling**
```typescript
// In WorkExperience.tsx, Education.tsx, etc.
const renderLocation = (location?: string) => {
  if (!location?.trim()) return null;
  return <span className="item-location">{location}</span>;
};

const renderDateLocationSeparator = (date?: string, location?: string) => {
  if (!date?.trim() || !location?.trim()) return null;
  return <span className="separator"> | </span>;
};
```

**f) Orphan Prevention (Bullet points)**
```css
.bullet-point {
  orphans: 2;
  widows: 2;
}
```

**g) Skills Formatting**
```css
.skill-category-title {
  font-weight: 700;
  margin-right: 6px;
}

.skill-list {
  display: inline;
  /* Comma-separated with no wrapping inside a skill name */
}

/* Individual skill names: prevent break inside */
.skill-name {
  white-space: nowrap;
}
```

**Tasks:**
- [ ] Update `WorkExperience.tsx` — date anchor, two-thirds rule, page breaks
- [ ] Update `Education.tsx` — date anchor, empty GPA/location hiding, page breaks
- [ ] Update `Profile.tsx` — paragraph enforcement, max-line visual indicator
- [ ] Update `Skills.tsx` — category grouping, max words per skill
- [ ] Update `Projects.tsx` — same pattern as WorkExperience
- [ ] Update `PersonalHeader.tsx` — contact no-wrap, separator hiding
- [ ] Create shared CSS constants file for vertical rhythm values

#### 2.2 Update Custom Renderers

Apply the same rules across all 12+ custom template renderers in `src/lib/templates/custom-renderers/`:
- `DataDrivenProTemplate.tsx`
- `DesignerModernTemplate.tsx`
- `TechProBlueTemplate.tsx`
- `ExecutiveProfessionalLayoutTemplate.tsx`
- `ElegantTimelineTemplate.tsx`
- `TheModernCVTemplate.tsx`
- And others

**Strategy:** Extract shared CSS into a utility function `generateEnforcedCSS(rules: LayoutRules): string` that all renderers can call.

**Tasks:**
- [ ] Create `src/lib/templates/shared-layout-css.ts` with reusable CSS generator
- [ ] Update each custom renderer to import and use shared CSS
- [ ] Ensure consistent date no-wrap, page break, and orphan rules across all templates

---

### Phase 3: Preview Layer Validation (Real-Time Feedback)

**Goal:** Provide users with real-time warnings and suggestions so they write high-quality content before downloading.

#### 3.1 Create Preview Validation Engine

**File:** `src/lib/validation/cv-preview-validator.ts`

```typescript
interface ValidationWarning {
  field: string;           // e.g., 'work[0].summary'
  section: string;         // e.g., 'work_experience'
  type: 'error' | 'warning' | 'info' | 'suggestion';
  message: string;         // User-facing message
  autoFix?: () => void;    // Optional auto-fix callback
  rule: string;            // Reference to the rule that was violated
}

interface ValidationResult {
  warnings: ValidationWarning[];
  score: number;           // 0-100 content quality score
  sectionScores: Record<string, number>;
}

function validateCVPreview(cvData: UnifiedCVDataStructure): ValidationResult {
  const warnings: ValidationWarning[] = [];
  
  // Rule: Job descriptions should be bullet points
  cvData.work?.forEach((job, i) => {
    if (job.summary && !job.summary.includes('<li>') && job.summary.length > 200) {
      warnings.push({
        field: `work[${i}].summary`,
        section: 'work_experience',
        type: 'suggestion',
        message: 'Work experiences look better as bullet points. Would you like us to format this for you?',
        autoFix: () => convertToBullets(job.summary),
        rule: 'job-description-format'
      });
    }
  });
  
  // Rule: Profile summary max 5 lines
  if (cvData.basics.summary) {
    const lineCount = cvData.basics.summary.split('\n').length;
    if (lineCount > 5) {
      warnings.push({
        field: 'basics.summary',
        section: 'profile',
        type: 'warning',
        message: `Profile summary is ${lineCount} lines. Recommended: 3-5 lines for best impact.`,
        rule: 'profile-max-lines'
      });
    }
  }
  
  // Rule: Bullet points should start with action verbs
  cvData.work?.forEach((job, i) => {
    job.highlights?.forEach((bullet, j) => {
      const firstWord = bullet.trim().split(' ')[0];
      if (!ACTION_VERBS.has(firstWord.toLowerCase())) {
        warnings.push({
          field: `work[${i}].highlights[${j}]`,
          section: 'work_experience',
          type: 'info',
          message: `"${firstWord}" is not a strong action verb. Consider starting with "Developed," "Managed," or "Led."`,
          rule: 'bullet-action-verb'
        });
      }
    });
  });
  
  // Rule: Skills max 3 words each
  cvData.skills?.forEach((group, i) => {
    group.skills?.forEach((skill, j) => {
      if (skill.split(' ').length > 3) {
        warnings.push({
          field: `skills[${i}].skills[${j}]`,
          section: 'skills',
          type: 'warning',
          message: `"${skill}" is more than 3 words. Keep skill tags concise for ATS scanning.`,
          rule: 'skill-max-words'
        });
      }
    });
  });
  
  return { warnings, score, sectionScores };
}
```

**Tasks:**
- [ ] Create `src/lib/validation/cv-preview-validator.ts`
- [ ] Create `src/lib/validation/action-verbs.ts` — list of strong action verbs
- [ ] Implement all validation rules from the shared schema
- [ ] Create scoring algorithm (weight different rules by importance)

#### 3.2 Create Preview Warning UI Components

**File:** `src/components/preview/ValidationWarnings.tsx`

```typescript
// Display warnings as inline banners or sidebar panel
// Color-coded by severity:
// - error: red (blocks export)
// - warning: amber (strongly recommended)
// - info: blue (informational)
// - suggestion: green (AI auto-fix available)
```

**Tasks:**
- [ ] Create `src/components/preview/ValidationWarnings.tsx` — warning display component
- [ ] Create `src/components/preview/WarningBanner.tsx` — individual warning card
- [ ] Integrate warnings panel into `BuilderPreview.tsx`
- [ ] Add "Fix with AI" button for suggestions with `autoFix` callbacks

#### 3.3 Real-Time Content Constraints

**File:** `src/components/preview/ContentConstraints.tsx`

```typescript
// Visual indicators for content limits:
// - Character counter for profile summary (X/500)
// - Line counter showing "3/5 lines" with visual progress
// - Bullet count indicator per experience entry
// - Warning color when approaching limits
```

**Tasks:**
- [ ] Create character/line counter components
- [ ] Add counters to Profile summary field
- [ ] Add counters to Experience bullet points
- [ ] Add visual feedback (green → amber → red) based on limits

#### 3.4 Input-Level Validation

**Integrate with existing form components:**
- Enforce `white-space: nowrap` on date inputs via CSS
- Add character limits to text areas
- Show real-time warnings as user types (debounced)

**Tasks:**
- [ ] Add `maxLength` attributes to form fields based on layout rules
- [ ] Create `useValidation` hook for real-time field validation
- [ ] Integrate hook with existing form components

---

### Phase 4: Shared CSS Generator

**Goal:** Single source of truth for all enforced CSS rules that both template components and custom renderers can use.

**File:** `src/lib/templates/shared-layout-css.ts`

```typescript
export function generateEnforcedCSS(rules: LayoutRules): string {
  return `
    /* ─── DATE-TITLE ANCHOR ─────────────────── */
    .entry-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 16px;
    }
    .item-date-group {
      white-space: nowrap;
      flex-shrink: 0;
    }
    .item-title-group {
      flex: 1;
      min-width: 0;
      overflow: hidden;
    }
    
    /* ─── TWO-THIRDS RULE ───────────────────── */
    .item-summary, .item-highlights {
      max-width: 75%;
    }
    
    /* ─── VERTICAL RHYTHM ───────────────────── */
    .section-content { margin-bottom: 24px; }
    .entry-list { gap: 12px; }
    
    /* ─── PAGE BREAKS ───────────────────────── */
    @media print {
      .section-header { break-after: avoid; }
      .entry-block { break-inside: avoid; }
      .section-content { break-before: auto; }
    }
    
    /* ─── ORPHAN PREVENTION ─────────────────── */
    .bullet-point { orphans: 2; widows: 2; }
    .entry-block { orphans: 3; widows: 2; }
    
    /* ─── EMPTY STATE SEPARATOR HIDING ──────── */
    .separator:empty, .separator:has(+ :empty) { display: none; }
    
    /* ─── URL SHORTENING ────────────────────── */
    .url-display {
      max-width: 200px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    
    /* ─── SKILLS FORMATTING ─────────────────── */
    .skill-name { white-space: nowrap; }
  `;
}
```

**Tasks:**
- [ ] Create `src/lib/templates/shared-layout-css.ts`
- [ ] Integrate into `TemplateRenderer.tsx`
- [ ] Integrate into all custom renderers (replace duplicated CSS)
- [ ] Create CSS variable system for theming

---

## File Structure

```
src/lib/validation/
├── cv-layout-rules.ts           # NEW: Shared rule definitions
├── default-rules.ts             # NEW: Production default values
├── cv-preview-validator.ts      # NEW: Preview validation engine
├── action-verbs.ts              # NEW: Strong action verb list
├── cv-schemas.ts                # EXISTING: Data integrity (unchanged)
├── schemas.ts                   # EXISTING: API validation (unchanged)
└── index.ts                     # UPDATE: Export new modules

src/lib/templates/
├── shared-layout-css.ts         # NEW: Shared CSS generator
├── template-renderer.tsx        # UPDATE: Use shared CSS
├── custom-renderers/            # UPDATE: All 12+ renderers
│   ├── DataDrivenProTemplate.tsx
│   └── ...
└── template-definition.ts       # EXISTING (unchanged)

src/components/cv-sections/
├── WorkExperience.tsx            # UPDATE: Enforce layout rules
├── Education.tsx                 # UPDATE: Enforce layout rules
├── Profile.tsx                   # UPDATE: Paragraph enforcement
├── Skills.tsx                    # UPDATE: Category formatting
├── Projects.tsx                  # UPDATE: Same pattern
├── PersonalHeader.tsx            # UPDATE: Contact no-wrap
└── ...

src/components/preview/
├── ValidationWarnings.tsx        # NEW: Warning display
├── WarningBanner.tsx             # NEW: Individual warning
├── ContentConstraints.tsx        # NEW: Character/line counters
└── BuilderPreview.tsx            # UPDATE: Integrate warnings
```

---

## Comparison Table: Where Each Rule Goes

| Rule | Layer | File | Implementation |
| :--- | :--- | :--- | :--- |
| **Dates on one line** | Template | `shared-layout-css.ts` | `white-space: nowrap` + `flex-shrink: 0` |
| **Bullets for Job Desc** | Preview | `cv-preview-validator.ts` | Warn if summary > 200 chars without `<li>` |
| **Paragraph for Profile** | Template | `Profile.tsx` | Render as `<p>`, never `<ul>` |
| **Hiding empty fields** | Template | Section components | Conditional rendering + CSS `:empty` |
| **Max Character Counts** | Preview | Form inputs + validator | `maxLength` + real-time counter |
| **No orphaned headers** | Template | `shared-layout-css.ts` | `break-after: avoid` on `h2` |
| **Two-thirds width** | Template | `shared-layout-css.ts` | `max-width: 75%` on descriptions |
| **Vertical rhythm** | Template | `shared-layout-css.ts` | `section = 2 × item` gap |
| **URL shortening** | Template + Preview | Section components | Truncate display, keep full URL in `href` |
| **Action verb check** | Preview | `cv-preview-validator.ts` | Flag bullets not starting with verb |
| **Skill max words** | Preview | `cv-preview-validator.ts` | Warn if skill > 3 words |
| **Orphan prevention** | Template | `shared-layout-css.ts` | `orphans: 2; widows: 2` |
| **Contact no-wrap** | Template | `PersonalHeader.tsx` | `white-space: nowrap` on email/url |
| **Max lines summary** | Preview | `ContentConstraints.tsx` | Visual line counter |

---

## Implementation Order

1. **Phase 1** — Shared Schema (foundation, no breaking changes)
2. **Phase 4** — Shared CSS Generator (enables Phase 2)
3. **Phase 2** — Template Enforcement (CSS updates to section components)
4. **Phase 3** — Preview Validation (user-facing warnings)

---

## Testing Strategy

- **Unit tests** for `cv-preview-validator.ts` — test each rule independently
- **Visual regression tests** for template CSS changes (screenshot comparison)
- **PDF output tests** — ensure page breaks, no-wrap, and empty states render correctly
- **Integration tests** — preview warnings appear correctly in BuilderPreview

---

## Dependencies

- No new npm packages required (all CSS-based + existing React/TypeScript)
- Uses existing `zod` for schema validation
- Uses existing `lucide-react` for warning icons
- Compatible with existing Tiptap editor, Zustand stores, and MongoDB models

---

## Estimated Scope

| Phase | Effort | Files Changed |
| :--- | :--- | :--- |
| Phase 1: Shared Schema | 1 day | 2 new files |
| Phase 4: Shared CSS | 1 day | 1 new + 1 update |
| Phase 2: Template Enforcement | 3 days | 8-12 section components + 12 custom renderers |
| Phase 3: Preview Validation | 3 days | 3 new files + 2 updates |
| **Total** | **8 days** | ~25 files |
