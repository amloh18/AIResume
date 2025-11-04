# Harmony Architecture Migration Guide

## Quick Reference Card

### Import Changes

```typescript
// ❌ OLD IMPORTS
import { getVisibleCVSections, hasSectionData } from '@/lib/utils/cv-section-selectors';

// ✅ NEW IMPORTS
import { getVisibleCVSections, getAddableCVSections } from '@/lib/selectors/cv-section-selectors';
import { hasSectionData, isSectionInitialized } from '@/lib/utils/cv-data-validation';
import { SECTION_REGISTRY, DEFAULT_SECTION_ORDER } from '@/lib/constants/cv-sections';
import { migrateLegacyCV } from '@/lib/migrations/cv-structure-migration';
```

## Step-by-Step Migration

### Step 1: Update Imports

In ALL files that import from the old selector:

**Files to Update**:
- ✅ `src/components/studio/CVStudio.tsx`
- ✅ `src/components/studio/RestructuredStudioLayout.tsx`
- ✅ `src/components/studio/SidebarStudioPanel.tsx`
- ✅ `src/components/studio/CVPreview.tsx`
- ✅ `src/components/studio/CVPreviewContent.tsx`
- ✅ `src/components/studio/panels/StructurePanel.tsx`

### Step 2: Apply Migration in Top-Level Component

In [`CVStudio.tsx`](src/components/studio/CVStudio.tsx):

```typescript
// Add migration helper
const migrateAndInitializeCVData = async (
  data: UnifiedCVDataStructure,
  templateId?: string | null
): Promise<UnifiedCVDataStructure> => {
  if (!hasStructure(data)) {
    console.log('🔄 Migrating legacy CV data...');
    data = migrateLegacyCV(data);
    console.log('✅ Migration complete');
  }
  return data;
};

// Use when setting CV data
const setCvDataWithStructure = useCallback(async (
  newData: UnifiedCVDataStructure | null,
  templateId?: string | null
) => {
  if (!newData) {
    setCvData(null);
    return;
  }

  // Migrate if needed
  const migratedData = await migrateAndInitializeCVData(newData, templateId);
  setCvData(migratedData);
}, []);
```

### Step 3: Update Component Logic

#### For Components That Display Sections

**OLD Pattern**:
```typescript
// ❌ Complex conditional logic
const sections = [];
if (cvData?.work && cvData.work.length > 0) {
  sections.push('work_experience');
}
if (cvData?.education && cvData.education.length > 0) {
  sections.push('education');
}
```

**NEW Pattern**:
```typescript
// ✅ Single selector call
const visibleSections = useMemo(
  () => getVisibleCVSections(cvData, documentType),
  [cvData, documentType]
);

// Map to component format
const sections = visibleSections.map(s => s.type);
```

#### For "Add Section" Modals

**OLD Pattern**:
```typescript
// ❌ Manual filtering
const addableSections = ALL_SECTIONS.filter(sectionId => 
  !hasSectionData(cvData, sectionId)
);
```

**NEW Pattern**:
```typescript
// ✅ Use palette selector
const addableSections = getAddableCVSections(cvData);

// Already formatted with label, icon, description
return addableSections.map(section => (
  <button key={section.id} onClick={() => addSection(section.id)}>
    <section.icon size={24} />
    <span>{section.label}</span>
    <p>{section.description}</p>
  </button>
));
```

#### For Section Visibility Checks

**OLD Pattern**:
```typescript
// ❌ Multiple visibility checks
const isWorkVisible = cvData?.work && cvData.work.length > 0;
const isEducationVisible = cvData?.education && cvData.education.length > 0;
```

**NEW Pattern**:
```typescript
// ✅ Pre-compute visible set
const visibleSections = useMemo(
  () => getVisibleCVSections(cvData, 'cv'),
  [cvData]
);

const visibleSet = useMemo(
  () => new Set(visibleSections.map(s => s.type)),
  [visibleSections]
);

// Fast O(1) lookup
const isWorkVisible = visibleSet.has('work_experience');
```

### Step 4: Update Section Addition Logic

When adding a new section, update the structure:

```typescript
const addNewSection = (sectionId: string) => {
  setCvData(prev => {
    if (!prev) return prev;
    
    const updatedData = { ...prev };
    
    // Add data to legacy array
    const defaultItem = getDefaultItemForSection(sectionId);
    updatedData[sectionId] = [...(prev[sectionId] || []), defaultItem];
    
    // Update structure visibility
    if (updatedData.structure?.sections) {
      updatedData.structure.sections = updatedData.structure.sections.map(s =>
        s.type === sectionId ? { ...s, visible: true } : s
      );
    }
    
    return updatedData;
  });
};
```

### Step 5: Update Section Removal Logic

When removing/hiding a section, update the structure:

```typescript
const removeSection = (sectionType: string, index: number) => {
  setCvData(prev => {
    if (!prev) return prev;
    
    const updatedData = { ...prev };
    const section = updatedData[sectionType];
    
    if (Array.isArray(section)) {
      // Remove from legacy array
      updatedData[sectionType] = section.filter((_, i) => i !== index);
      
      // If array is now empty, hide in structure
      if (updatedData[sectionType].length === 0 && updatedData.structure?.sections) {
        updatedData.structure.sections = updatedData.structure.sections.map(s =>
          s.type === sectionType ? { ...s, visible: false } : s
        );
      }
    }
    
    return updatedData;
  });
};
```

## Common Patterns

### Pattern 1: Render Sections in Order

```typescript
const LayoutComponent = ({ cvData }) => {
  const visibleSections = useMemo(
    () => getVisibleCVSections(cvData, 'cv'),
    [cvData]
  );

  return (
    <div>
      {visibleSections.map(section => (
        <SectionForm key={section.id} sectionType={section.type} />
      ))}
    </div>
  );
};
```

### Pattern 2: Section Navigation

```typescript
const Sidebar = ({ cvData }) => {
  const visibleSections = useMemo(
    () => getVisibleCVSections(cvData, 'cv'),
    [cvData]
  );

  return (
    <nav>
      {visibleSections.map(section => (
        <NavLink key={section.id} to={`#${section.type}`}>
          <section.icon size={20} />
          <span>{section.label}</span>
        </NavLink>
      ))}
    </nav>
  );
};
```

### Pattern 3: Add Section Modal

```typescript
const AddSectionModal = ({ cvData, onAddSection }) => {
  const addableSections = getAddableCVSections(cvData);

  return (
    <div className="grid grid-cols-3 gap-4">
      {addableSections.map(section => (
        <button key={section.id} onClick={() => onAddSection(section.id)}>
          <section.icon size={32} />
          <h3>{section.label}</h3>
          <p>{section.description}</p>
          <Badge>{section.category}</Badge>
        </button>
      ))}
    </div>
  );
};
```

### Pattern 4: Conditional Rendering

```typescript
const Component = ({ cvData }) => {
  const visibleSections = useMemo(
    () => getVisibleCVSections(cvData, 'cv'),
    [cvData]
  );

  const visibleSet = useMemo(
    () => new Set(visibleSections.map(s => s.type)),
    [visibleSections]
  );

  return (
    <div>
      {visibleSet.has('work_experience') && <WorkSection />}
      {visibleSet.has('education') && <EducationSection />}
    </div>
  );
};
```

## Migration Checklist

For each component file:

- [ ] Update imports to new file locations
- [ ] Replace manual visibility logic with `getVisibleCVSections()`
- [ ] Replace manual validation with `hasSectionData()`
- [ ] Memoize selector results with `useMemo()`
- [ ] Use Set-based lookups for performance
- [ ] Update section addition to modify structure
- [ ] Update section removal to modify structure
- [ ] Test with both legacy and modern CVs

## Testing Your Migration

### Test 1: Legacy CV Loads Correctly

```typescript
// Create a legacy CV (no structure property)
const legacyCV = {
  basics: { name: "John Doe", email: "john@example.com" },
  work: [{ position: "Developer", name: "Acme Corp", summary: "Built things" }],
  education: [],
  skills: []
};

// Load in CVStudio
// Expected: Migration runs automatically
// Expected: personal_header and work_experience visible
// Expected: education and skills NOT visible (no data)
```

### Test 2: Add Section Works

```typescript
// Get addable sections
const addable = getAddableCVSections(cvData);

// Should include sections with no data
expect(addable.some(s => s.id === 'skills')).toBe(true);

// Add skills section
addNewSection('skills');

// Skills should now be visible
const visible = getVisibleCVSections(cvData, 'cv');
expect(visible.some(s => s.type === 'skills')).toBe(true);

// Skills should NOT be addable anymore
const nowAddable = getAddableCVSections(cvData);
expect(nowAddable.some(s => s.id === 'skills')).toBe(false);
```

### Test 3: Section Order Preserved

```typescript
// Add sections in specific order
addNewSection('projects');
addNewSection('skills');
addNewSection('languages');

// Get visible sections
const sections = getVisibleCVSections(cvData, 'cv');

// Order should match DEFAULT_SECTION_ORDER
const types = sections.map(s => s.type);
const expectedOrder = ['personal_header', 'work_experience', 'projects', 'skills', 'languages'];

expect(types).toEqual(expectedOrder);
```

## Troubleshooting

### Issue: TypeScript errors about missing properties

**Error**: `Property 'title' does not exist on type 'VisibleCVSection'`

**Fix**: Use `label` instead of `title`:
```typescript
// ❌ OLD
section.title

// ✅ NEW
section.label
```

### Issue: TypeScript errors about missing 'hasData'

**Error**: `Property 'hasData' does not exist on type 'VisibleCVSection'`

**Fix**: Compute it separately:
```typescript
// ❌ OLD
section.hasData

// ✅ NEW
hasSectionData(cvData, section.type)
```

### Issue: Migration not running

**Symptom**: Sections not appearing, structure undefined

**Fix**: Ensure migration runs in CVStudio:
```typescript
// In data loading useEffect
const migratedData = await migrateAndInitializeCVData(loadedData, templateId);
setCvData(migratedData);
```

### Issue: Add Section modal shows empty sections already visible

**Symptom**: Sections appear in both "Add Section" modal and sidebar

**Fix**: Ensure structure visibility is updated when adding:
```typescript
if (updatedData.structure?.sections) {
  updatedData.structure.sections = updatedData.structure.sections.map(s =>
    s.type === newSectionType ? { ...s, visible: true } : s
  );
}
```

## Performance Tips

### 1. Always Memoize Selector Results

```typescript
// ✅ Good - computed once per data change
const sections = useMemo(
  () => getVisibleCVSections(cvData, 'cv'),
  [cvData]
);

// ❌ Bad - recomputed on every render
const sections = getVisibleCVSections(cvData, 'cv');
```

### 2. Use Set for Lookups

```typescript
// ✅ Fast - O(1)
const visibleSet = useMemo(
  () => new Set(sections.map(s => s.type)),
  [sections]
);
const isVisible = visibleSet.has('work_experience');

// ❌ Slow - O(n)
const isVisible = sections.some(s => s.type === 'work_experience');
```

### 3. Batch Structure Updates

```typescript
// ✅ Good - single structure update
setCvData(prev => {
  const updated = { ...prev };
  updated.skills = newSkills;
  updated.structure.sections = updated.structure.sections.map(s =>
    s.type === 'skills' ? { ...s, visible: true } : s
  );
  return updated;
});

// ❌ Bad - multiple state updates
setCvData(prev => ({ ...prev, skills: newSkills }));
// ... later
updateStructureVisibility('skills', true);
```

## Before/After Examples

### Example 1: Sidebar Navigation

**Before**:
```typescript
const getCVSections = () => {
  const sections = [];
  
  // Manual checks for each section
  if (cvData?.basics?.name || cvData?.basics?.email) {
    sections.push({
      id: 'personal_header',
      title: 'Personal Information',
      icon: User
    });
  }
  
  if (cvData?.work && cvData.work.length > 0) {
    if (cvData.work.some(w => w.name || w.position)) {
      sections.push({
        id: 'work_experience',
        title: 'Work Experience',
        icon: Briefcase
      });
    }
  }
  
  // ... repeat for all sections
  
  return sections;
};
```

**After**:
```typescript
const getCVSections = () => {
  const sections = getVisibleCVSections(cvData, 'cv');
  
  return sections.map(section => ({
    id: section.type,
    title: section.label,
    icon: section.icon
  }));
};
```

### Example 2: Form Layout

**Before**:
```typescript
const FormLayout = () => {
  const hasWork = cvData?.work && cvData.work.length > 0;
  const hasEducation = cvData?.education && cvData.education.length > 0;
  const hasSkills = cvData?.skills && cvData.skills.length > 0;
  
  return (
    <div>
      <PersonalInfoForm />
      {hasWork && <WorkSection />}
      {hasEducation && <EducationSection />}
      {hasSkills && <SkillsSection />}
    </div>
  );
};
```

**After**:
```typescript
const FormLayout = () => {
  const visibleSections = useMemo(
    () => getVisibleCVSections(cvData, 'cv'),
    [cvData]
  );
  
  const sectionComponents = {
    personal_header: PersonalInfoForm,
    work_experience: WorkSection,
    education: EducationSection,
    skills: SkillsSection
  };
  
  return (
    <div>
      {visibleSections.map(section => {
        const Component = sectionComponents[section.type];
        return Component ? <Component key={section.id} /> : null;
      })}
    </div>
  );
};
```

### Example 3: Section Validation

**Before**:
```typescript
// ❌ Scattered validation logic
const hasWorkData = cvData?.work && 
  cvData.work.length > 0 && 
  cvData.work.some(w => w.name?.trim() || w.position?.trim());

const hasEducationData = cvData?.education && 
  cvData.education.length > 0 && 
  cvData.education.some(e => e.institution?.trim() || e.area?.trim());
```

**After**:
```typescript
// ✅ Centralized validation
const hasWorkData = hasSectionData(cvData, 'work_experience');
const hasEducationData = hasSectionData(cvData, 'education');
```

## Verification Steps

After migrating each component:

1. **Check TypeScript**: No type errors
2. **Check Console**: Migration logs appear once on load
3. **Check Sidebar**: Sections appear in correct order
4. **Check Forms**: Only visible sections render
5. **Check Preview**: Sections match sidebar
6. **Test Add**: Modal shows correct addable sections
7. **Test Add Flow**: Adding section works, updates all views
8. **Test Remove**: Removing section works, updates all views

## Common Gotchas

### 1. Structure Dependency in useMemo

```typescript
// ❌ BAD - unnecessary re-renders
const sections = useMemo(
  () => getVisibleCVSections(cvData, 'cv'),
  [cvData, cvData?.structure] // Redundant!
);

// ✅ GOOD - cvData includes structure
const sections = useMemo(
  () => getVisibleCVSections(cvData, 'cv'),
  [cvData] // Structure changes trigger this
);
```

### 2. Calling Selectors Conditionally

```typescript
// ❌ BAD - breaks React rules
if (cvData) {
  const sections = useMemo(() => getVisibleCVSections(cvData, 'cv'), [cvData]);
}

// ✅ GOOD - always call hooks
const sections = useMemo(
  () => cvData ? getVisibleCVSections(cvData, 'cv') : [],
  [cvData]
);
```

### 3. Forgetting to Update Structure

```typescript
// ❌ BAD - only updates data, not structure
setCvData(prev => ({
  ...prev,
  skills: newSkills
}));

// ✅ GOOD - updates both data and structure
setCvData(prev => {
  const updated = { ...prev };
  updated.skills = newSkills;
  if (updated.structure?.sections) {
    updated.structure.sections = updated.structure.sections.map(s =>
      s.type === 'skills' ? { ...s, visible: newSkills.length > 0 } : s
    );
  }
  return updated;
});
```

## Success Criteria

Your migration is complete when:

- ✅ All imports updated to new architecture
- ✅ Migration runs automatically on data load
- ✅ No duplicate validation logic in components
- ✅ Sidebar sections match form sections match preview sections
- ✅ "Add Section" modal shows correct available sections
- ✅ Adding a section updates all three views immediately
- ✅ No TypeScript errors
- ✅ No console warnings about missing structure
- ✅ Cover letter mode returns empty sections correctly

## Next Steps

After migrating to Harmony architecture, you can easily add:

1. **Drag & Drop Section Reordering**
2. **Section Visibility Toggles**
3. **Section Duplication**
4. **Custom Section Templates**
5. **Conditional Section Rules**

All of these become trivial because the structure is the source of truth!

## Support

For issues or questions:
- See [`HARMONY_ARCHITECTURE.md`](HARMONY_ARCHITECTURE.md) for architectural details
- Check TypeScript errors against the type definitions
- Verify migration logs in browser console
- Test with both legacy and modern CVs