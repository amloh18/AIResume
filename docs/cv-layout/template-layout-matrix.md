# CV Layout Engine — Template Layout Matrix

> **Date**: 2026-08-31
> **Scope**: Every canvas template's layout properties, spacing, fonts, colors
> **Purpose**: Reference for layout fixes and regression testing

---

## 1. TEMPLATE REGISTRY (15 Active Canvas Templates)

Source: `src/components/cv-builder-pro/registry.tsx`

### Template Summary Table

| Template ID | Name | Section Layout | Columns (Default) | Section Split | Accent |
|------------|------|----------------|-------------------|---------------|--------|
| modern-classic | Modern Classic | default | 1 | split | sidebar |
| modern-executive | Modern Executive | stacked | 1 | split | — |
| bold-impact | Bold Impact | side-accent | 1 | split | sidebar |
| green-accent | Green Accent | side-accent | 1 | split | sidebar |
| premium-dark | Premium Dark | default | 1 | split | — |
| premium-bold | Premium Bold | stacked | 1 | split | — |
| professional-minimal | Professional Minimal | stacked | 1 | split | — |
| two-column-clean | Two-Column Clean | two-column | 2 | split | — |
| modern-minimal-v2 | Modern Minimal | two-column | 2 | split | — |
| creative-serif | Creative Serif | two-column | 2 | split | — |
| professional-executive | Professional Executive | two-column | 2 | split | — |
| executive-classic | Executive Classic | two-column | 2 | split | — |
| classic-reversed | Classic Reversed | two-column | 2 | split | — |
| athena | Athena | two-column | 2 | split | — |
| contemporary | Contemporary | two-column | 2 | split | — |

---

## 2. TEMPLATE DETAILED PROPERTIES

### 2.1 modern-classic
```typescript
{
  id: 'modern-classic',
  name: 'Modern Classic',
  description: 'Two-tone sidebar with clean content areas',
  category: 'professional',
  isNew: false,
  schemaVersion: '1',
  sectionLayout: 'default',        // Single column, full width
  sectionColumns: { count: 1 },
  sectionSnippets: {
    contact: ['contact-header'],
    summary: ['paragraph'],
    experience: ['bullets', 'achievements'],
    education: ['education-entry'],
    skills: ['skills-categorized'],
    projects: ['project-entry'],
  },
  sectionFonts: {
    heading: 'Georgia',
    body: 'Inter',
  },
  sectionDesignOverrides: {
    summary: { backgroundColor: 'rgba(240,240,240,0.3)', padding: '12px', borderRadius: '4px' },
  },
  sectionSplitting: {},             // Uses defaults
  sectionWeights: {},               // Uses defaults
}
```

**Layout pattern**: Full-width sections, no columns. Sidebar accent via template-specific CSS.

### 2.2 modern-executive
```typescript
{
  id: 'modern-executive',
  name: 'Modern Executive',
  description: 'Classic elegance with contemporary spacing',
  category: 'executive',
  sectionLayout: 'stacked',         // Header + sections stacked
  sectionColumns: { count: 1 },
  sectionSnippets: {
    contact: ['contact-header'],
    summary: ['paragraph'],
    experience: ['bullets', 'achievements'],
    education: ['education-entry'],
    skills: ['skills-categorized'],
    projects: ['project-entry'],
  },
  sectionFonts: {
    heading: 'Georgia',
    body: 'Inter',
  },
  sectionDesignOverrides: {
    experience: { borderBottom: '1px solid #e5e7eb', paddingBottom: '12px' },
  },
}
```

**Layout pattern**: Stacked layout, single column. Clean separation between sections.

### 2.3 bold-impact
```typescript
{
  id: 'bold-impact',
  name: 'Bold Impact',
  description: 'Bold accents with strong visual hierarchy',
  category: 'creative',
  sectionLayout: 'side-accent',     // Left sidebar accent
  sectionColumns: { count: 1 },
  sectionSnippets: {
    contact: ['contact-header'],
    summary: ['paragraph'],
    experience: ['bullets', 'achievements'],
    education: ['education-entry'],
    skills: ['skills-tags'],
    projects: ['project-entry'],
  },
  sectionFonts: {
    heading: 'Arial',
    body: 'Arial',
  },
  sectionDesignOverrides: {
    contact: { backgroundColor: '#1f2937', color: '#ffffff' },
    skills: { backgroundColor: '#f3f4f6' },
  },
}
```

**Layout pattern**: Side accent — left sidebar with colored background, right content area.

### 2.4 green-accent
```typescript
{
  id: 'green-accent',
  name: 'Green Accent',
  description: 'Professional with green highlights',
  category: 'professional',
  sectionLayout: 'side-accent',
  sectionColumns: { count: 1 },
  sectionSnippets: {
    contact: ['contact-header'],
    summary: ['paragraph'],
    experience: ['bullets', 'achievements'],
    education: ['education-entry'],
    skills: ['skills-tags'],
    projects: ['project-entry'],
  },
  sectionFonts: {
    heading: 'Inter',
    body: 'Inter',
  },
  sectionDesignOverrides: {
    contact: { backgroundColor: '#059669', color: '#ffffff' },
    skills: { backgroundColor: '#ecfdf5' },
  },
}
```

**Layout pattern**: Side accent — green sidebar, right content area.

### 2.5 premium-dark
```typescript
{
  id: 'premium-dark',
  name: 'Premium Dark',
  description: 'Dark theme for modern professionals',
  category: 'modern',
  sectionLayout: 'default',
  sectionColumns: { count: 1 },
  sectionSnippets: {
    contact: ['contact-header'],
    summary: ['paragraph'],
    experience: ['bullets', 'achievements'],
    education: ['education-entry'],
    skills: ['skills-categorized'],
    projects: ['project-entry'],
  },
  sectionFonts: {
    heading: 'Inter',
    body: 'Inter',
  },
  sectionDesignOverrides: {
    contact: { backgroundColor: '#111827', color: '#f9fafb' },
    experience: { backgroundColor: '#1f2937', color: '#e5e7eb' },
    skills: { backgroundColor: '#374151', color: '#d1d5db' },
  },
}
```

**Layout pattern**: Dark theme, full-width sections. No sidebar.

### 2.6 premium-bold
```typescript
{
  id: 'premium-bold',
  name: 'Premium Bold',
  description: 'Bold header with clean content',
  category: 'professional',
  sectionLayout: 'stacked',
  sectionColumns: { count: 1 },
  sectionSnippets: {
    contact: ['contact-header'],
    summary: ['paragraph'],
    experience: ['bullets', 'achievements'],
    education: ['education-entry'],
    skills: ['skills-tags'],
    projects: ['project-entry'],
  },
  sectionFonts: {
    heading: 'Arial',
    body: 'Arial',
  },
  sectionDesignOverrides: {
    contact: { borderBottom: '3px solid #000000', paddingBottom: '16px' },
  },
}
```

**Layout pattern**: Stacked, bold header, clean content.

### 2.7 professional-minimal
```typescript
{
  id: 'professional-minimal',
  name: 'Professional Minimal',
  description: 'Clean and minimal design',
  category: 'minimal',
  sectionLayout: 'stacked',
  sectionColumns: { count: 1 },
  sectionSnippets: {
    contact: ['contact-header'],
    summary: ['paragraph'],
    experience: ['bullets'],
    education: ['education-entry'],
    skills: ['skills-tags'],
    projects: ['project-entry'],
  },
  sectionFonts: {
    heading: 'Georgia',
    body: 'Inter',
  },
  sectionDesignOverrides: {
    summary: { fontStyle: 'italic', color: '#6b7280' },
  },
}
```

**Layout pattern**: Minimal, stacked, serif headings.

### 2.8 two-column-clean
```typescript
{
  id: 'two-column-clean',
  name: 'Two-Column Clean',
  description: 'Clean two-column layout',
  category: 'two-column',
  sectionLayout: 'two-column',
  sectionColumns: { count: 2 },
  sectionSnippets: {
    contact: ['contact-header'],
    summary: ['paragraph'],
    experience: ['bullets', 'achievements'],
    education: ['education-entry'],
    skills: ['skills-tags'],
    projects: ['project-entry'],
  },
  sectionFonts: {
    heading: 'Inter',
    body: 'Inter',
  },
  sectionDesignOverrides: {
    skills: { columnSpan: 'all' },
  },
}
```

**Layout pattern**: Two-column layout. Skills span both columns.

### 2.9 modern-minimal-v2 (DEFAULT JOURNEY CV)
```typescript
{
  id: 'modern-minimal-v2',
  name: 'Modern Minimal',
  description: 'Modern minimal with clean lines',
  category: 'modern',
  schemaVersion: '2',
  sectionLayout: 'two-column',
  sectionColumns: { count: 2 },
  sectionSnippets: {
    contact: ['contact-header'],
    summary: ['paragraph'],
    experience: ['bullets', 'achievements'],
    education: ['education-entry'],
    skills: ['skills-tags'],
    projects: ['project-entry'],
  },
  sectionFonts: {
    heading: 'Inter',
    body: 'Inter',
  },
  sectionDesignOverrides: {
    summary: { marginBottom: '16px' },
    experience: { marginBottom: '12px' },
    skills: { columnSpan: 'all', backgroundColor: '#f9fafb', padding: '8px' },
  },
  spacing: {
    sectionGap: 24,
    blockGap: 12,
    snippetGap: 6,
    blockPadding: 12,
    headingMarginBottom: 10,
  },
}
```

**Layout pattern**: Two-column, V2 template with spacing presets. Default for journey CVs.

### 2.10 creative-serif
```typescript
{
  id: 'creative-serif',
  name: 'Creative Serif',
  description: 'Creative layout with serif fonts',
  category: 'creative',
  sectionLayout: 'two-column',
  sectionColumns: { count: 2 },
  sectionSnippets: {
    contact: ['contact-header'],
    summary: ['paragraph'],
    experience: ['bullets', 'achievements'],
    education: ['education-entry'],
    skills: ['skills-tags'],
    projects: ['project-entry'],
  },
  sectionFonts: {
    heading: 'Georgia',
    body: 'Georgia',
  },
  sectionDesignOverrides: {
    summary: { fontStyle: 'italic', borderLeft: '3px solid #000000', paddingLeft: '12px' },
  },
}
```

**Layout pattern**: Two-column, serif fonts throughout.

### 2.11 professional-executive
```typescript
{
  id: 'professional-executive',
  name: 'Professional Executive',
  description: 'Executive-level professional layout',
  category: 'executive',
  sectionLayout: 'two-column',
  sectionColumns: { count: 2 },
  sectionSnippets: {
    contact: ['contact-header'],
    summary: ['paragraph'],
    experience: ['bullets', 'achievements'],
    education: ['education-entry'],
    skills: ['skills-categorized'],
    projects: ['project-entry'],
  },
  sectionFonts: {
    heading: 'Georgia',
    body: 'Inter',
  },
  sectionDesignOverrides: {
    experience: { marginBottom: '16px' },
    education: { marginBottom: '12px' },
  },
}
```

**Layout pattern**: Two-column, executive style.

### 2.12 executive-classic
```typescript
{
  id: 'executive-classic',
  name: 'Executive Classic',
  description: 'Classic executive layout',
  category: 'executive',
  schemaVersion: '2',
  sectionLayout: 'two-column',
  sectionColumns: { count: 2 },
  sectionSnippets: {
    contact: ['contact-header'],
    summary: ['paragraph'],
    experience: ['bullets', 'achievements'],
    education: ['education-entry'],
    skills: ['skills-categorized'],
    projects: ['project-entry'],
  },
  sectionFonts: {
    heading: 'Georgia',
    body: 'Georgia',
  },
  sectionDesignOverrides: {
    summary: { borderBottom: '2px solid #000000', paddingBottom: '12px' },
  },
  spacing: {
    sectionGap: 28,
    blockGap: 14,
    snippetGap: 7,
    blockPadding: 14,
    headingMarginBottom: 12,
  },
}
```

**Layout pattern**: Two-column, classic executive, V2 spacing.

### 2.13 classic-reversed
```typescript
{
  id: 'classic-reversed',
  name: 'Classic Reversed',
  description: 'Classic layout with reversed color scheme',
  category: 'professional',
  sectionLayout: 'two-column',
  sectionColumns: { count: 2 },
  sectionSnippets: {
    contact: ['contact-header'],
    summary: ['paragraph'],
    experience: ['bullets', 'achievements'],
    education: ['education-entry'],
    skills: ['skills-tags'],
    projects: ['project-entry'],
  },
  sectionFonts: {
    heading: 'Inter',
    body: 'Inter',
  },
  sectionDesignOverrides: {
    contact: { backgroundColor: '#111827', color: '#f9fafb' },
    skills: { backgroundColor: '#f3f4f6' },
  },
}
```

**Layout pattern**: Two-column, reversed colors (dark header).

### 2.14 athena
```typescript
{
  id: 'athena',
  name: 'Athena',
  description: 'Elegant design with balanced spacing',
  category: 'elegant',
  sectionLayout: 'two-column',
  sectionColumns: { count: 2 },
  sectionSnippets: {
    contact: ['contact-header'],
    summary: ['paragraph'],
    experience: ['bullets', 'achievements'],
    education: ['education-entry'],
    skills: ['skills-tags'],
    projects: ['project-entry'],
  },
  sectionFonts: {
    heading: 'Georgia',
    body: 'Inter',
  },
  sectionDesignOverrides: {
    summary: { borderLeft: '2px solid #6b7280', paddingLeft: '12px' },
  },
}
```

**Layout pattern**: Two-column, elegant style.

### 2.15 contemporary
```typescript
{
  id: 'contemporary',
  name: 'Contemporary',
  description: 'Contemporary design with modern spacing',
  category: 'modern',
  schemaVersion: '2',
  sectionLayout: 'two-column',
  sectionColumns: { count: 2 },
  sectionSnippets: {
    contact: ['contact-header'],
    summary: ['paragraph'],
    experience: ['bullets', 'achievements'],
    education: ['education-entry'],
    skills: ['skills-tags'],
    projects: ['project-entry'],
  },
  sectionFonts: {
    heading: 'Inter',
    body: 'Inter',
  },
  sectionDesignOverrides: {
    experience: { marginBottom: '16px' },
    education: { marginBottom: '12px' },
    skills: { backgroundColor: '#f0fdf4', padding: '8px', borderRadius: '4px' },
  },
  spacing: {
    sectionGap: 24,
    blockGap: 12,
    snippetGap: 6,
    blockPadding: 12,
    headingMarginBottom: 10,
  },
}
```

**Layout pattern**: Two-column, contemporary, V2 spacing.

---

## 3. V2 TEMPLATE SPACING PRESETS

From `src/lib/templates/v2/template-definitions.ts`:

| Mode | sectionGap | blockGap | snippetGap | blockPadding | headingMarginBottom |
|------|-----------|----------|------------|--------------|---------------------|
| 0.7 | 12 | 6 | 3 | 6 | 4 |
| 0.8 | 16 | 8 | 4 | 8 | 6 |
| 0.9 | 20 | 10 | 5 | 10 | 8 |
| 1.0 | 24 | 12 | 6 | 12 | 10 |
| 1.1 | 28 | 14 | 7 | 14 | 12 |
| 1.2 | 32 | 16 | 8 | 16 | 14 |
| 1.3 | 36 | 18 | 9 | 18 | 16 |
| 1.4 | 40 | 20 | 10 | 20 | 18 |

Default mode: **1.0** (24/12/6/12/10)

---

## 4. SECTION ORDERING AND SPLITTING

From `src/components/cv-builder-pro/sectionWeights.ts`:

### Default Weights (ordering)
```typescript
contact: 1        // TOP (always first)
summary: 2
experience: 3
projects: 4
skills: 5
education: 6
certifications: 7
awards: 8
languages: 9
publications: 10
volunteer: 11
references: 12
interests: 13
custom: 14
achievements: 15  // BOTTOM
```

### Default Splitting Rules
```typescript
summary: 'keep'       // Never split across pages
skills: 'keep'        // Never split across pages
education: 'keep'     // Never split across pages
experience: 'split'   // Can split (default)
projects: 'split'     // Can split (default)
```

### User Overrides
Users can override via:
- `sectionWeights`: Change ordering
- `sectionSplitting`: Change keep/split behavior
- `sectionColumns`: Change column count per section
- `sectionLayout`: Change layout type per section

---

## 5. TEMPLATE LAYOUT PATTERNS

### Pattern A: Default (Single Column)
- **Templates**: modern-classic, modern-executive, premium-dark
- **Layout**: Full-width sections, no columns
- **Section layout**: `'default'`
- **Column count**: 1
- **Use case**: Simple, clean layouts

### Pattern B: Side Accent
- **Templates**: bold-impact, green-accent
- **Layout**: Left sidebar (colored) + right content area
- **Section layout**: `'side-accent'`
- **Column count**: 1 (but visually two areas)
- **Use case**: Visual emphasis, creative roles

### Pattern C: Stacked
- **Templates**: premium-bold, professional-minimal
- **Layout**: Header + sections stacked vertically
- **Section layout**: `'stacked'`
- **Column count**: 1
- **Use case**: Clean, minimal layouts

### Pattern D: Two-Column
- **Templates**: two-column-clean, modern-minimal-v2, creative-serif, professional-executive, executive-classic, classic-reversed, athena, contemporary
- **Layout**: Left/right column split
- **Section layout**: `'two-column'`
- **Column count**: 2 (default, can be overridden)
- **Use case**: Compact layouts, more content per page

---

## 6. SNIPPET COMPONENTS BY SECTION

### contact
- `contact-header` — Name, title, contact info

### summary
- `paragraph` — Text paragraph

### experience
- `bullets` — Bullet points
- `achievements` — Achievement highlights

### education
- `education-entry` — Degree, school, dates

### skills
- `skills-tags` — Tag-style skills
- `skills-categorized` — Grouped skills

### projects
- `project-entry` — Project description

### certifications
- `certification-entry` — Certification details

### awards
- `award-entry` — Award details

### languages
- `language-entry` — Language proficiency

### publications
- `publication-entry` — Publication details

### volunteer
- `volunteer-entry` — Volunteer experience

### references
- `reference-entry` — Reference details

### interests
- `interest-entry` — Interest/hobby details

### custom
- `custom-entry` — Custom section content

### achievements
- `achievement-entry` — Achievement highlights

---

## 7. MEASUREMENT GAPS BY TEMPLATE

### Default Templates (modern-classic, modern-executive, premium-dark)
- **Gap**: No column spacing to account for
- **Gap**: Section gaps not measured in pagination
- **Gap**: Heading margin bottom not measured

### Side Accent Templates (bold-impact, green-accent)
- **Gap**: Sidebar width not accounted for in content area
- **Gap**: Sidebar background height not measured
- **Gap**: Content area width changes with sidebar

### Stacked Templates (premium-bold, professional-minimal)
- **Gap**: Header height not measured in pagination
- **Gap**: Section gaps not measured

### Two-Column Templates (all 8 templates)
- **Gap**: Column height calculation doesn't account for actual content flow
- **Gap**: Column breaks can't be precisely controlled
- **Gap**: Section spanning both columns not measured
- **Gap**: Column gap not measured

### V2 Templates (modern-minimal-v2, executive-classic, contemporary)
- **Gap**: Spacing presets not used in canvas measurement
- **Gap**: `blockPadding`, `headingMarginBottom` not accounted for
- **Gap**: Template-specific `sectionDesignOverrides` add spacing not measured

---

## 8. FONT HANDLING

### Canvas Editor
- Uses CSS `@import` from Google Fonts CDN
- Fonts: `Inter`, `Georgia`, `Arial`
- Icons: `@remixicon/react` (CSS-based)

### PDF Export
- Same fonts via CSS `@import`
- System fonts as fallback
- No dynamic font measurement

### Known Issues
- Font loading timing can affect measurements
- Different browsers render fonts differently
- PDF fonts may differ slightly from canvas fonts

---

## 9. COLOR SYSTEM

### Light Theme (Default)
```css
--bg-primary: #ffffff      /* Page background */
--text-primary: #111827     /* Main text */
--text-secondary: #6b7280   /* Secondary text */
--border-primary: #e5e7eb   /* Borders */
--accent-primary: #013f2e   /* Accent color */
```

### Dark Theme (premium-dark)
```css
--bg-primary: #111827
--text-primary: #f9fafb
--text-secondary: #d1d5db
--border-primary: #374151
--accent-primary: #84cc16
```

### Template-Specific Colors
Each template can override colors via `sectionDesignOverrides`:
```typescript
sectionDesignOverrides: {
  contact: { backgroundColor: '#1f2937', color: '#ffffff' },
  skills: { backgroundColor: '#f3f4f6' },
}
```

---

## 10. PAGE DIMENSIONS

From `src/lib/utils/page-dimensions.ts`:

### Letter (US Default)
```typescript
{
  id: 'letter',
  name: 'Letter',
  width: 8.5,    // inches
  height: 11,    // inches
  unit: 'in',
  css: { width: '8.5in', height: '11in' },
  pixels: { width: 816, height: 1056 },  // At 96 DPI
}
```

### A4 (International)
```typescript
{
  id: 'a4',
  name: 'A4',
  width: 210,    // mm
  height: 297,   // mm
  unit: 'mm',
  css: { width: '210mm', height: '297mm' },
  pixels: { width: 794, height: 1123 },  // At 96 DPI
}
```

### Canvas Default
```typescript
const DEFAULT_PAGE_WIDTH = 816;   // Letter width in pixels
const DEFAULT_PAGE_HEIGHT = 1056; // Letter height in pixels
```

### Margins
```typescript
const DEFAULT_MARGINS = {
  top: 32,
  right: 32,
  bottom: 32,
  left: 32,
};
```

---

## 11. REGRESSION TEST MATRIX

### Template × Layout Pattern
| Template | Default | Side Accent | Stacked | Two-Column |
|----------|---------|-------------|---------|------------|
| modern-classic | ✓ | | | |
| modern-executive | | | ✓ | |
| bold-impact | | ✓ | | |
| green-accent | | ✓ | | |
| premium-dark | ✓ | | | |
| premium-bold | | | ✓ | |
| professional-minimal | | | ✓ | |
| two-column-clean | | | | ✓ |
| modern-minimal-v2 | | | | ✓ |
| creative-serif | | | | ✓ |
| professional-executive | | | | ✓ |
| executive-classic | | | | ✓ |
| classic-reversed | | | | ✓ |
| athena | | | | ✓ |
| contemporary | | | | ✓ |

### Content Density Scenarios
1. **Minimal**: 3 sections, short content
2. **Standard**: 5 sections, moderate content
3. **Dense**: 7+ sections, long content
4. **Edge case**: Very long experience (10+ entries)
5. **Edge case**: Very long skills (50+ tags)
6. **Edge case**: Very long education (5+ entries)

### Pagination Scenarios
1. **Single page**: All content fits
2. **Two pages**: Content splits at section boundary
3. **Three pages**: Content splits mid-section
4. **Column split**: Content splits across columns
5. **Keep together**: Section moves to next page
6. **Force break**: Page break before section
