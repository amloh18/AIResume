# WYSIWYG Editor Synchronization Fix

## Problem

The work experience summary field was not displaying data loaded from the database, even though the data was saved correctly. This was caused by a synchronization bug in the `useWYSIWYG` hook.

## Root Cause

The `lastSyncedValueRef` in `useWYSIWYG.tsx` was storing inconsistent data:
- Sometimes it stored the prop value (which could be plain text from database)
- Sometimes it stored HTML content (from the editor)

This inconsistency caused comparison failures:
1. Database has plain text: `"Managed a team"`
2. Editor has HTML: `"<p>Managed a team</p>"`
3. `lastSyncedValueRef` stores plain text: `"Managed a team"`
4. User types, editor becomes: `"<p>Managed a team and improved...</p>"`
5. `lastSyncedValueRef` stores HTML: `"<p>Managed a team and improved...</p>"`
6. When prop changes, comparison fails because we're comparing plain text to HTML

## Solution

### 1. Fixed Hook Synchronization (`src/components/ui/useWYSIWYG.tsx`)

**Key Changes:**
- Always normalize both the prop value and `lastSyncedValueRef` to HTML before comparison
- This ensures we're always comparing HTML to HTML, not plain text to HTML
- Updated both the sync effect and `handleContentChange` to use normalized HTML comparison

**Before:**
```typescript
const needsUpdate = lastSyncedValueRef.current !== newValue;
```

**After:**
```typescript
const normalizedPropHTML = convertPlainTextToHTML(newValue);
const normalizedLastSynced = lastSyncedValueRef.current 
  ? convertPlainTextToHTML(lastSyncedValueRef.current).trim() 
  : '';
const needsUpdate = normalizedLastSynced !== normalizedPropValue;
```

### 2. Migration Script (`scripts/migrate-work-summary-to-html.ts`)

Created a migration script to fix existing database entries:
- Finds all CVs with work experience items
- Converts plain text summaries to HTML format
- Preserves existing HTML summaries
- Updates the database with normalized HTML

**Usage:**
```bash
npx tsx scripts/migrate-work-summary-to-html.ts
```

## Testing

After applying the fix:

1. **Run the migration script** to fix existing data:
   ```bash
   npx tsx scripts/migrate-work-summary-to-html.ts
   ```

2. **Test the editor:**
   - Load a CV with work experience
   - Verify summaries display correctly
   - Edit a summary and save
   - Reload the page and verify it still displays

3. **Test new entries:**
   - Create a new work experience entry
   - Add a summary with formatting
   - Save and reload
   - Verify formatting is preserved

## Files Modified

1. `src/components/ui/useWYSIWYG.tsx` - Fixed synchronization logic
2. `scripts/migrate-work-summary-to-html.ts` - New migration script

## Prevention

The fix ensures:
- All comparisons use normalized HTML format
- Plain text from database is automatically converted to HTML
- HTML from editor is preserved correctly
- No more format mismatches between prop values and editor content

## Migration Status

- [ ] Run migration script on production database
- [ ] Verify all work summaries display correctly
- [ ] Test editing and saving work summaries
- [ ] Monitor for any edge cases

