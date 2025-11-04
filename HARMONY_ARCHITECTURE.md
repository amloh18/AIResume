# Harmony Architecture - CV Section Management

## Overview

The Harmony architecture is a centralized, migration-first approach to CV section management that establishes a **single source of truth** for section visibility and ordering across the entire application.

## The Problem It Solves

Previously, the application had:
- **Multiple sources of truth**: Different components tracked section visibility independently
- **Legacy data format**: CVs stored sections as flat arrays without structure metadata
- **Duplicate logic**: `hasSectionData()` validation scattered across multiple files
- **No ordering**: Section display order was hardcoded or inconsistent
- **Complex conditionals**: Components needed complex logic to determine visibility

## The Solution: The "Harmony" Pattern

The Harmony architecture introduces three core concepts:

### 1. **The Foundation** - Section Registry & Validation

**File**: [`src/lib/constants/cv-sections.ts`](src/lib/constants/cv-sections.ts)

The `SECTION_REGISTRY` is the master list of all available CV sections:

```typescript
export const SECTION_REGISTRY: Record<string, SectionRegistryEntry> = {
  personal_header: {
    label: 'Personal Information',
    icon: User,
    category: 'header',
    dataKey: 'basics',
    isList: false,
    isRequired: true,
    description: 'Name, contact details, and professional summary'
  },
  work_experience: {
    label: 'Work Experience',
    icon: Briefcase,
    category: 'experience',
    dataKey: 'work',
    isList: true,
    isRequired: false,
    description: 'Professional work history and achievements'
  },
  // ... all other sections
};
```

**File**: [`src/lib/utils/cv-data-validation.ts`](src/lib/utils/cv-data-validation.ts)

Robust validation that returns `false` for:
- `[]`, `[{}]`, `[{ name: "" }]`, `[""]` 
- Empty objects with all empty fields

```typescript
export function hasSectionData(
  cvData: UnifiedCVDataStructure | null,
  sectionType: string
): boolean
```

### 2. **The Migration** - Legacy to Modern

**File**: [`src/lib/migrations/cv-structure-migration.ts`](src/lib/migrations/cv-structure-migration.ts)

The `migrateLegacyCV()` function is a **NON-DESTRUCTIVE** in-memory migration:

```typescript
export function migrateLegacyCV(
  cvData: UnifiedCVDataStructure
): UnifiedCVDataStructure {
  // 1. Check if already migrated
  if (hasStructure(cvData)) {
    return cvData;
  }

  // 2. Create structure.sections array
  const sections: CVSectionStructure[] = [];

  // 3. Loop through DEFAULT_SECTION_ORDER
  for (const sectionId of DEFAULT_SECTION_ORDER) {
    // 4. Use robust validation
    const hasData = hasSectionData(cvData, sectionId);

    // Add to structure
    sections.push({
      id: sectionId,
      type: sectionId,
      visible: hasData
    });
  }

  // 5. Return new cvData with structure added
  return {
    ...cvData,
    structure: { sections }
  };
}
```

**Key Features**:
- Runs once when editor loads
- Preserves ALL legacy data
- Returns new object with `structure` property
- No database changes

### 3. **The Selectors** - The "Harmony" Conductors

**File**: [`src/lib/selectors/cv-section-selectors.ts`](src/lib/selectors/cv-section-selectors.ts)

Two core selectors drive the entire application:

#### The "Conductor" - `getVisibleCVSections()`

Returns sections that should be displayed:

```typescript
export function getVisibleCVSections(
  cvData: UnifiedCVDataStructure | null,
  documentType: 'cv' | 'cover-letter' = 'cv'
): VisibleCVSection[]
```

**Logic is SIMPLE** because migration guarantees structure exists:
```typescript
return cvData.structure.sections
  .filter(section => section.visible !== false)
  .map(section => ({
    id: section.id,
    type: section.type,
    label: SECTION_REGISTRY[section.type].label,
    icon: SECTION_REGISTRY[section.type].icon,
    order: index
  }));
```

#### The "Palette" - `getAddableCVSections()`

Returns sections that can be added (not currently visible):

```typescript
export function getAddableCVSections(
  cvData: UnifiedCVDataStructure | null
): AddableCVSection[]
```

**Inverse Dependency Pattern** - does NOT call `getVisibleCVSections()`:
```typescript
const visibleSectionTypes = new Set<string>(
  cvData.structure.sections
    .filter(s => s.visible !== false)
    .map(s => s.type)
);

return Object.keys(SECTION_REGISTRY)
  .filter(id => !visibleSectionTypes.has(id))
  .map(id => SECTION_REGISTRY[id]);
```

## Usage in Components

### 1. CVStudio.tsx - Top-Level Migration

**Migration Point**: When data is first loaded or set:

```typescript
const setCvDataWithStructure = useCallback(async (
  newData: UnifiedCVDataStructure | null,
  templateId?: string | null
) => {
  if (!newData) {
    setCvData(null);
    return;
  }

  // Migrate if needed (runs in-memory)
  const migratedData = await migrateAndInitializeCVData(newData, templateId);

  setCvData(migratedData);
}, []);
```

**Sidebar Sections**: Uses `getVisibleCVSections()`

```typescript
const getCVSectionsForSidebar = () => {
  if (!cvData) return [];

  const visibleSections = getVisibleCVSections(cvData, documentType);

  return visibleSections.map(section => ({
    id: section.type,
    title: section.label,
    icon: section.icon,
    visible: true
  }));
};
```

**Add Section Modal**: Uses `getAddableCVSections()`

```typescript
const getAvailableSectionsToAdd = () => {
  const addableSections = getAddableCVSections(cvData);
  
  return addableSections.map(section => ({
    id: section.id,
    title: section.label,
    icon: section.icon,
    category: section.category,
    description: section.description
  }));
};
```

### 2. RestructuredStudioLayout.tsx - Form Sections

```typescript
// Get visible sections - memoized for performance
const visibleSectionsList = useMemo(
  () => getVisibleCVSections(cvData, 'cv'),
  [cvData]
);

// Fast lookup Set for O(1) visibility checks
const visibleSectionIds = useMemo(
  () => new Set(visibleSectionsList.map(s => s.type)),
  [visibleSectionsList]
);

// Render sections in structure order
return visibleSectionsList.map(s => s.type).map(renderSection);
```

### 3. CVPreview.tsx - Preview Rendering

```typescript
// Get visible sections for preview
const visibleSectionsList = useMemo(
  () => getVisibleCVSections(cvData, documentType || 'cv'),
  [cvData, documentType]
);

// Section order respects structure
const effectiveSectionOrder = useMemo(() => {
  if (visibleSectionsList.length > 0) {
    return visibleSectionsList.map(s => s.type);
  }
  return sectionOrder; // Fallback
}, [visibleSectionsList, sectionOrder]);
```

## Benefits of the Harmony Architecture

### 1. **Single Source of Truth**
- ALL visibility logic in [`getVisibleCVSections()`](src/lib/selectors/cv-section-selectors.ts:62)
- ALL addable logic in [`getAddableCVSections()`](src/lib/selectors/cv-section-selectors.ts:114)
- No conflicts between components

### 2. **DRY Principle**
- Validation logic centralized in [`hasSectionData()`](src/lib/utils/cv-data-validation.ts:76)
- No duplicate conditionals scattered across files

### 3. **Migration-First Design**
- Legacy data handled in one place: [`migrateLegacyCV()`](src/lib/migrations/cv-structure-migration.ts:38)
- All components work with modern structure

### 4. **Performance Optimized**
- Selectors are memoized in components
- Fast Set-based lookups (`O(1)` instead of `O(n)`)
- No redundant calculations

### 5. **Maintainability**
- Add new section? Update only [`SECTION_REGISTRY`](src/lib/constants/cv-sections.ts:36)
- Change validation? Update only [`hasSectionData()`](src/lib/utils/cv-data-validation.ts:76)
- Modify visibility logic? Update only [`getVisibleCVSections()`](src/lib/selectors/cv-section-selectors.ts:62)

## Data Flow

```
┌─────────────────┐
│  Legacy CV Data │
│  (from database)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ migrateLegacyCV │  ← Runs once when data loads
│  (in-memory)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Modern CV Data │
│ with structure  │
└────────┬────────┘
         │
         ├──────────────────┬──────────────────┐
         ▼                  ▼                  ▼
┌──────────────────┐  ┌──────────────┐  ┌─────────────┐
│getVisibleCVSect..│  │getAddableCVS.│  │ Components  │
│   (Conductor)    │  │  (Palette)   │  │  (consume)  │
└────────┬─────────┘  └──────┬───────┘  └──────┬──────┘
         │                   │                  │
         ▼                   ▼                  ▼
┌──────────────────┐  ┌──────────────┐  ┌─────────────┐
│   Sidebar Nav    │  │ Add Section  │  │   Preview   │
│   Layout Forms   │  │    Modal     │  │   Template  │
└──────────────────┘  └──────────────┘  └─────────────┘
```

## File Structure

```
src/
├── lib/
│   ├── constants/
│   │   └── cv-sections.ts          # SECTION_REGISTRY + DEFAULT_SECTION_ORDER
│   ├── utils/
│   │   └── cv-data-validation.ts   # hasSectionData() + isSectionInitialized()
│   ├── selectors/
│   │   └── cv-section-selectors.ts # getVisibleCVSections() + getAddableCVSections()
│   └── migrations/
│       └── cv-structure-migration.ts # migrateLegacyCV()
└── components/
    └── studio/
        ├── CVStudio.tsx            # Applies migration + uses selectors
        ├── RestructuredStudioLayout.tsx # Renders forms from selector
        ├── SidebarStudioPanel.tsx  # Nav links from selector
        ├── CVPreview.tsx           # Preview from selector
        └── panels/
            └── StructurePanel.tsx  # Alternative structure view
```

## Adding a New Section

To add a new section type (e.g., "hobbies"):

### Step 1: Update Type Schema
Add to [`src/types/unified-cv-schema.ts`](src/types/unified-cv-schema.ts):
```typescript
export interface UnifiedCVDataStructure {
  // ... existing fields
  hobbies: Array<{
    name: string;
    description: string;
  }>;
}
```

### Step 2: Update Registry
Add to [`src/lib/constants/cv-sections.ts`](src/lib/constants/cv-sections.ts):
```typescript
export const SECTION_REGISTRY: Record<string, SectionRegistryEntry> = {
  // ... existing sections
  hobbies: {
    label: 'Hobbies',
    icon: Heart,
    category: 'other',
    dataKey: 'hobbies',
    isList: true,
    isRequired: false,
    description: 'Personal hobbies and interests'
  }
};

export const DEFAULT_SECTION_ORDER = [
  // ... existing sections
  'hobbies'
];
```

### Step 3: Update Validation
Add case to [`src/lib/utils/cv-data-validation.ts`](src/lib/utils/cv-data-validation.ts:76):
```typescript
if (sectionType === 'hobbies') {
  const hobbies = data as UnifiedCVDataStructure['hobbies'];
  if (!hasArrayData(hobbies)) return false;
  
  return hobbies.some(item =>
    !isEmptyString(item.name) ||
    !isEmptyString(item.description)
  );
}
```

### Step 4: Create Form Component
Create `src/components/studio/forms/HobbiesSection.tsx`

### Step 5: Add to Layout
Update [`src/components/studio/RestructuredStudioLayout.tsx`](src/components/studio/RestructuredStudioLayout.tsx):
```typescript
case 'hobbies':
  return <HobbiesSection ... />;
```

**That's it!** The section will automatically:
- Appear in the "Add Section" modal when not visible
- Show in sidebar navigation when visible
- Render in correct order in layout and preview
- Respect structure-based visibility

## Migration Behavior

### For Legacy CVs (no structure)

**Before Migration**:
```json
{
  "basics": { "name": "John Doe", "email": "john@example.com" },
  "work": [{ "position": "Developer", "name": "Acme Corp" }],
  "education": [],
  "skills": []
}
```

**After Migration** (in-memory):
```json
{
  "basics": { "name": "John Doe", "email": "john@example.com" },
  "work": [{ "position": "Developer", "name": "Acme Corp" }],
  "education": [],
  "skills": [],
  "structure": {
    "sections": [
      { "id": "personal_header", "type": "personal_header", "visible": true },
      { "id": "work_experience", "type": "work_experience", "visible": true },
      { "id": "education", "type": "education", "visible": false },
      { "id": "skills", "type": "skills", "visible": false }
    ]
  }
}
```

### For Modern CVs (with structure)

Migration is skipped - data passes through unchanged.

## Best Practices

### DO ✅

1. **Always use selectors** instead of direct structure access:
   ```typescript
   // Good
   const sections = useMemo(
     () => getVisibleCVSections(cvData, documentType),
     [cvData, documentType]
   );
   ```

2. **Memoize selector results** in components:
   ```typescript
   const visibleSections = useMemo(
     () => getVisibleCVSections(cvData, 'cv'),
     [cvData] // Only dependency: structure is inside cvData
   );
   ```

3. **Use fast Set lookups** for existence checks:
   ```typescript
   const visibleIds = useMemo(
     () => new Set(sections.map(s => s.type)),
     [sections]
   );
   
   const isVisible = visibleIds.has(sectionType); // O(1)
   ```

4. **Apply migration in top-level component** (CVStudio.tsx):
   ```typescript
   const cvData = useMemo(() => {
     if (!originalCVData) return null;
     return migrateLegacyCV(originalCVData);
   }, [originalCVData]);
   ```

### DON'T ❌

1. **Don't access structure directly** in components:
   ```typescript
   // Bad
   const visible = cvData.structure.sections
     .filter(s => s.visible)
     .map(s => s.type);
   
   // Good
   const visible = getVisibleCVSections(cvData, 'cv');
   ```

2. **Don't duplicate validation logic**:
   ```typescript
   // Bad
   const hasWork = cvData.work && cvData.work.length > 0 && 
     cvData.work.some(w => w.name || w.position);
   
   // Good
   const hasWork = hasSectionData(cvData, 'work_experience');
   ```

3. **Don't call selectors inside selectors** (creates circular dependencies):
   ```typescript
   // Bad
   export function getAddableSections(cvData) {
     const visible = getVisibleCVSections(cvData); // Circular!
     return ALL_SECTIONS.filter(s => !visible.includes(s));
   }
   
   // Good
   export function getAddableSections(cvData) {
     const visibleTypes = new Set(
       cvData.structure.sections
         .filter(s => s.visible)
         .map(s => s.type)
     );
     return ALL_SECTIONS.filter(s => !visibleTypes.has(s));
   }
   ```

4. **Don't skip migration**:
   ```typescript
   // Bad
   setCvData(dataFromAPI); // Might be legacy format!
   
   // Good
   setCvDataWithStructure(dataFromAPI, templateId);
   ```

## Testing the Architecture

### Test Case 1: Legacy CV Migration
```typescript
const legacyCV = {
  basics: { name: "John", email: "john@example.com" },
  work: [{ position: "Dev", name: "Corp" }],
  education: []
};

const migrated = migrateLegacyCV(legacyCV);

// Should have structure
expect(migrated.structure).toBeDefined();
expect(migrated.structure.sections).toHaveLength(12); // All sections

// Visible sections only have data
const visible = getVisibleCVSections(migrated, 'cv');
expect(visible).toHaveLength(2); // personal_header + work_experience
```

### Test Case 2: Add Section Flow
```typescript
// Get addable sections
const addable = getAddableCVSections(cvData);
expect(addable).toContainEqual(
  expect.objectContaining({ id: 'skills' })
);

// Add skills section
const updated = {
  ...cvData,
  skills: [{ category: 'Technical', skills: ['React'] }],
  structure: {
    sections: cvData.structure.sections.map(s =>
      s.type === 'skills' ? { ...s, visible: true } : s
    )
  }
};

// Skills should now be visible
const visible = getVisibleCVSections(updated, 'cv');
expect(visible.some(s => s.type === 'skills')).toBe(true);

// Skills should NOT be addable anymore
const nowAddable = getAddableCVSections(updated);
expect(nowAddable.some(s => s.id === 'skills')).toBe(false);
```

## Performance Characteristics

- **Migration**: `O(n)` where n = number of section types (12) - runs once
- **getVisibleCVSections**: `O(n)` where n = structure.sections length
- **getAddableCVSections**: `O(m)` where m = SECTION_REGISTRY size
- **isSectionVisible (Set lookup)**: `O(1)` constant time

## Troubleshooting

### Issue: Sections not showing in sidebar
**Cause**: CV data might not be migrated yet
**Solution**: Check migration in CVStudio.tsx is running:
```typescript
console.log('Has structure?', hasStructure(cvData));
```

### Issue: "Add Section" shows sections that are already visible
**Cause**: Structure visibility not updated when section added
**Solution**: When adding section, update structure:
```typescript
cvData.structure.sections.map(s =>
  s.type === newSectionType ? { ...s, visible: true } : s
)
```

### Issue: Section order not matching structure
**Cause**: Component using hardcoded order instead of selector
**Solution**: Use selector order:
```typescript
// Bad
const order = ['personal_header', 'work_experience', ...];

// Good
const sections = getVisibleCVSections(cvData, 'cv');
const order = sections.map(s => s.type);
```

## Future Enhancements

The Harmony architecture makes these features trivial to add:

1. **Drag & Drop Reordering**: Simply reorder `structure.sections` array
2. **Section Visibility Toggle**: Toggle `section.visible` property
3. **Multiple Instances**: Already supported (structure uses UUIDs)
4. **Section Templates**: Add to registry with default content
5. **Conditional Sections**: Add visibility rules to registry

## Migration Checklist

When migrating existing code to use Harmony:

- [ ] Replace direct structure access with [`getVisibleCVSections()`](src/lib/selectors/cv-section-selectors.ts:62)
- [ ] Replace custom validation with [`hasSectionData()`](src/lib/utils/cv-data-validation.ts:76)
- [ ] Add [`migrateLegacyCV()`](src/lib/migrations/cv-structure-migration.ts:38) call when loading data
- [ ] Memoize selector results with `useMemo()`
- [ ] Use Set-based lookups for visibility checks
- [ ] Update imports to use new file locations

## Summary

The Harmony architecture achieves **harmony** between:
- **Data**: Single structure source of truth
- **Logic**: Centralized selectors and validation
- **Components**: All use same selectors, automatic sync
- **Performance**: Memoized, optimized lookups
- **Maintainability**: Change in one place, works everywhere

The result: Components that "just work" without complex conditional logic, automatic synchronization across the UI, and a foundation ready for advanced features.