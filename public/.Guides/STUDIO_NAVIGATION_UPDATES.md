# Studio Navigation Updates - Canvas Integration

## Overview

All navigation points from Canvas (dashboard) to Studio have been updated to use the new centralized architecture URL format.

## Updated Files

### 1. Canvas.tsx (`src/components/dashboard/Canvas.tsx`)

**Changes Made:**

1. **Master CV Edit** (Line 1038)
   - **Before:** `/studio?cvId=${masterCV.id}&master=true`
   - **After:** `/studio?master=true`
   - **Reason:** Master CV is loaded automatically by session type, no need for cvId

2. **Duplicated CV** (Line 1064)
   - **Before:** `/studio?cvId=${duplicatedCVId}&mode=document-first`
   - **After:** `/studio?cvId=${duplicatedCVId}`
   - **Reason:** Standalone mode is auto-detected, no mode parameter needed

3. **Cover Letter Edit** (Line 2250)
   - **Before:** `/studio?type=cover_letter&coverLetterId=${cl.id}`
   - **After:** `/studio?coverLetterId=${cl.id}`
   - **Reason:** Document type is auto-detected from coverLetterId parameter

4. **CV Click Handler** (Line 1174-1191)
   - **Before:** Opened journey modal for CVs with journeys
   - **After:** Direct navigation to studio
     - With journey: `/studio?journeyId=${journeyId}&documentType=cv`
     - Without journey: `/studio?cvId=${cvId}`
   - **Reason:** New architecture handles all data loading, no need for modal

### 2. JobModal.tsx (`src/components/dashboard/JobModal.tsx`)

**Changes Made:**

1. **Continue Journey** (Line 430-440)
   - **Before:** Complex mode determination with multiple URL parameters
   - **After:** Simple journey-based navigation
     - Cover letter: `/studio?journeyId=${journeyId}&documentType=cover-letter`
     - CV: `/studio?journeyId=${journeyId}&documentType=cv`
   - **Reason:** Studio automatically determines what to load based on journey state

### 3. JourneyTimelineCard.tsx (`src/components/dashboard/JourneyTimelineCard.tsx`)

**Changes Made:**

1. **Edit CV Button** (Line 2208-2211)
   - **Before:** `/studio?journeyId=${journey.id}&cvId=${journey.cvId}&jobId=${journey.jobId}&type=cv&mode=${mode}`
   - **After:** `/studio?journeyId=${journey.id}&documentType=cv`
   - **Reason:** All data loaded via hydrate API, no need for individual IDs

### 4. Analytics.tsx (`src/components/dashboard/Analytics.tsx`)

**Changes Made:**

1. **Show ATS Analysis** (Line 165-172)
   - **Before:** `/studio?cvId=${masterCV.id}&type=cv&mode=ats`
   - **After:** `/studio?master=true`
   - **Reason:** Master CV mode loads automatically

2. **Improve Score** (Line 1291)
   - **Before:** `/studio`
   - **After:** `/studio?master=true`
   - **Reason:** Should open master CV for improvement

3. **Create/Write Cover Letter** (Line 1303-1306)
   - **Before:** `/studio?type=cover_letter`
   - **After:** `/dashboard/application-tracker`
   - **Reason:** Cover letters should be created through journeys for proper context

## URL Format Reference

### New Architecture URL Patterns

**Journey Mode:**
```
/studio?journeyId={journeyId}&documentType={cv|cover-letter}
```
- Automatically loads journey, job, and document
- Supports mode switching (CV ↔ Cover Letter)

**Standalone Mode:**
```
/studio?cvId={cvId}
/studio?coverLetterId={coverLetterId}
```
- Loads document directly
- Optional job linking available

**Master CV Mode:**
```
/studio?master=true
```
- Loads master CV only
- No journey/job dependencies
- Isolated editing session

### Legacy URL Support

The studio page still supports legacy URL formats for backward compatibility:
- `?type=cv` → Maps to `documentType=cv`
- `?type=cover_letter` → Maps to `documentType=cover-letter`
- `?mode=...` → Ignored (mode determined by journey state)

## Navigation Flow

### From Canvas Dashboard

1. **Master CV Card → Studio**
   ```
   Click "Edit Master CV"
   → /studio?master=true
   → StudioDataProvider detects master-cv session
   → Loads master CV via hydrate API
   ```

2. **CV Card (with Journey) → Studio**
   ```
   Click CV card
   → /studio?journeyId={id}&documentType=cv
   → StudioDataProvider detects journey session
   → Loads journey + job + CV via hydrate API
   ```

3. **CV Card (standalone) → Studio**
   ```
   Click CV card
   → /studio?cvId={id}
   → StudioDataProvider detects standalone session
   → Loads CV via hydrate API
   ```

4. **Cover Letter Card → Studio**
   ```
   Click cover letter card
   → /studio?coverLetterId={id}
   → StudioDataProvider detects standalone session
   → Loads cover letter via hydrate API
   ```

5. **Journey Modal → Studio**
   ```
   Click "Continue Journey"
   → /studio?journeyId={id}&documentType={cv|cover-letter}
   → StudioDataProvider detects journey session
   → Loads all data via hydrate API
   ```

## Benefits

1. **Simplified URLs** - No complex mode parameters
2. **Automatic Detection** - Session type determined from URL
3. **Single API Call** - Hydrate endpoint loads everything
4. **Consistent Behavior** - Same navigation pattern everywhere
5. **Backward Compatible** - Legacy URLs still work

## Testing Checklist

- [ ] Master CV edit from Canvas works
- [ ] CV with journey navigates correctly
- [ ] CV without journey navigates correctly
- [ ] Cover letter edit navigates correctly
- [ ] Journey modal "Continue" button works
- [ ] Journey timeline "Edit" button works
- [ ] Analytics "Improve Score" works
- [ ] All URLs use new format
- [ ] No console errors on navigation
- [ ] Data loads correctly in all cases

## Migration Notes

All navigation has been updated to use the new format. The old format parameters (`mode`, `type` as separate param) are still supported for backward compatibility but are no longer used in new code.

If you find any other navigation points that need updating, follow this pattern:
- Journey mode: `?journeyId={id}&documentType={cv|cover-letter}`
- Standalone: `?cvId={id}` or `?coverLetterId={id}`
- Master CV: `?master=true`

