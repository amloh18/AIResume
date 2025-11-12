# CVStudio Testing Script

## Overview

This document provides a comprehensive testing script for the new CVStudio centralized architecture. All tests should be performed manually in a running development or staging environment.

---

## Prerequisites

1. **Development server running**: `npm run dev`
2. **Test user account** with:
   - At least one master CV
   - At least one journey with job
   - At least one standalone CV
   - At least one cover letter
3. **Browser DevTools open** (Network tab + Console)
4. **Note**: Clear browser cache before starting tests

---

## Test Suite 1: Journey Mode

### Test 1.1: Load Journey CV

**Steps:**
1. Navigate to: `/studio?journeyId=YOUR_JOURNEY_ID&documentType=cv`
2. Wait for page to load

**Expected Results:**
- ✅ Single `/api/studio/hydrate` call in Network tab
- ✅ No duplicate API calls
- ✅ CV data displays correctly
- ✅ Top bar shows "Journey Mode" badge
- ✅ Job selector shows correct job
- ✅ Mode switch (CV ↔ Cover Letter) is visible
- ✅ Load time < 500ms

**Pass/Fail:** ___________

### Test 1.2: Edit CV in Journey Mode

**Steps:**
1. Edit the "Work Experience" section
2. Add a new job entry
3. Wait 2 seconds (auto-save delay)
4. Check Network tab

**Expected Results:**
- ✅ Save indicator shows "Saving..." during save
- ✅ Save indicator shows "Saved" after completion
- ✅ Single `/api/studio/save` call in Network tab
- ✅ Save completes successfully (status 200)
- ✅ No errors in console

**Pass/Fail:** ___________

### Test 1.3: Switch to Cover Letter

**Steps:**
1. Click "Cover Letter" button in mode switch
2. Wait for transition

**Expected Results:**
- ✅ "Switching..." indicator appears
- ✅ CV auto-saves before switch
- ✅ Cover letter loads or creates successfully
- ✅ URL updates to include `documentType=cover-letter`
- ✅ Editor shows cover letter content
- ✅ Mode switch highlights "Cover Letter"
- ✅ Transition completes in < 2 seconds

**Pass/Fail:** ___________

### Test 1.4: Edit Cover Letter

**Steps:**
1. Edit cover letter content
2. Wait 2 seconds
3. Check Network tab

**Expected Results:**
- ✅ Auto-save triggers
- ✅ Save completes successfully
- ✅ Changes persist

**Pass/Fail:** ___________

### Test 1.5: Switch Back to CV

**Steps:**
1. Click "CV" button in mode switch
2. Wait for transition

**Expected Results:**
- ✅ Cover letter auto-saves before switch
- ✅ CV loads with previous edits intact
- ✅ URL updates back to `documentType=cv`
- ✅ All previous CV changes still present

**Pass/Fail:** ___________

### Test 1.6: Change Job in Journey

**Steps:**
1. Select different job from job selector dropdown
2. Wait for update

**Expected Results:**
- ✅ Job context updates
- ✅ ATS analysis resets/updates
- ✅ No data loss

**Pass/Fail:** ___________

### Test 1.7: Force Save (Ctrl+S)

**Steps:**
1. Make an edit
2. Press Ctrl+S (or Cmd+S on Mac) immediately
3. Check Network tab

**Expected Results:**
- ✅ Save triggers immediately (bypasses debounce)
- ✅ Save completes successfully
- ✅ Keyboard shortcut works

**Pass/Fail:** ___________

### Test 1.8: Exit Journey Studio

**Steps:**
1. Make an unsaved edit
2. Click "Exit" button

**Expected Results:**
- ✅ Auto-save triggers before exit
- ✅ Redirects to dashboard
- ✅ No data loss
- ✅ Journey updated in database

**Pass/Fail:** ___________

---

## Test Suite 2: Standalone Mode

### Test 2.1: Load Standalone CV

**Steps:**
1. Navigate to: `/studio?cvId=YOUR_CV_ID`
2. Wait for page to load

**Expected Results:**
- ✅ Single hydrate call
- ✅ CV loads correctly
- ✅ No "Journey Mode" badge
- ✅ Mode switch NOT visible
- ✅ Job selector visible (optional linking)
- ✅ Load time < 300ms

**Pass/Fail:** ___________

### Test 2.2: Edit Standalone CV

**Steps:**
1. Edit multiple sections
2. Wait for auto-save
3. Verify saves

**Expected Results:**
- ✅ Auto-save works correctly
- ✅ All changes persist
- ✅ No journey updates triggered

**Pass/Fail:** ___________

### Test 2.3: Link Job to Standalone CV

**Steps:**
1. Select a job from job selector
2. Wait for update

**Expected Results:**
- ✅ Job context updates
- ✅ ATS tab becomes available
- ✅ Can run ATS analysis

**Pass/Fail:** ___________

### Test 2.4: Change Template

**Steps:**
1. Go to "Design" tab in sidebar
2. Select different template
3. Check preview panel

**Expected Results:**
- ✅ Template changes immediately
- ✅ Preview updates
- ✅ Immediate save triggered (not debounced)
- ✅ Changes persist

**Pass/Fail:** ___________

---

## Test Suite 3: Master CV Mode

### Test 3.1: Load Master CV

**Steps:**
1. Navigate to: `/studio?master=true`
2. Wait for page to load

**Expected Results:**
- ✅ Single hydrate call
- ✅ Master CV loads
- ✅ "Master CV" badge displays
- ✅ Job selector HIDDEN
- ✅ Mode switch NOT visible
- ✅ ATS tab HIDDEN
- ✅ Load time < 200ms

**Pass/Fail:** ___________

### Test 3.2: Edit Master CV

**Steps:**
1. Edit multiple sections
2. Add/remove sections
3. Wait for auto-save

**Expected Results:**
- ✅ All edits work correctly
- ✅ Auto-save triggers
- ✅ `metadata.isMaster` flag preserved
- ✅ No journey references created

**Pass/Fail:** ___________

### Test 3.3: Change Master CV Template

**Steps:**
1. Go to Design tab
2. Select different template
3. Save and exit

**Expected Results:**
- ✅ Template changes
- ✅ Master CV flag preserved
- ✅ Changes persist across sessions

**Pass/Fail:** ___________

### Test 3.4: Exit and Reload Master CV

**Steps:**
1. Exit studio
2. Re-open master CV
3. Verify data

**Expected Results:**
- ✅ All changes persisted
- ✅ Still loads as master CV
- ✅ `metadata.isMaster` still true

**Pass/Fail:** ___________

---

## Test Suite 4: Error Scenarios

### Test 4.1: Network Failure During Save

**Steps:**
1. Open DevTools > Network tab
2. Make an edit
3. Enable "Offline" mode before auto-save triggers
4. Wait for save attempt

**Expected Results:**
- ✅ Save fails gracefully
- ✅ Error banner displays with retry option
- ✅ No data loss in UI
- ✅ Can retry when back online

**Pass/Fail:** ___________

### Test 4.2: Invalid Data Validation

**Steps:**
1. Try to save CV with invalid data (if applicable)
2. Check error handling

**Expected Results:**
- ✅ Validation errors shown
- ✅ User can correct errors
- ✅ Save succeeds after corrections

**Pass/Fail:** ___________

### Test 4.3: Session Expired

**Steps:**
1. Clear auth token (simulate expired session)
2. Try to make an edit
3. Wait for save attempt

**Expected Results:**
- ✅ Auth error detected
- ✅ User redirected to login
- ✅ Or error message with login link

**Pass/Fail:** ___________

### Test 4.4: Concurrent Edits (Two Tabs)

**Steps:**
1. Open same CV in two browser tabs
2. Edit in Tab 1, save
3. Edit in Tab 2
4. Try to save Tab 2

**Expected Results:**
- ✅ Last write wins OR conflict warning shown
- ✅ No data corruption
- ✅ User aware of conflict

**Pass/Fail:** ___________

### Test 4.5: Browser Storage Full

**Steps:**
1. Fill localStorage (if possible)
2. Try to edit and save

**Expected Results:**
- ✅ Handles storage errors gracefully
- ✅ Save still works (doesn't rely solely on localStorage)
- ✅ User informed if local caching fails

**Pass/Fail:** ___________

---

## Test Suite 5: Performance

### Test 5.1: Initial Load Performance

**Steps:**
1. Clear browser cache
2. Load journey mode studio
3. Measure time in DevTools Performance tab

**Expected Results:**
- ✅ Total load time < 500ms
- ✅ Hydrate API call < 300ms
- ✅ Time to Interactive < 800ms

**Measured Time:** ___________ms  
**Pass/Fail:** ___________

### Test 5.2: Auto-Save Performance

**Steps:**
1. Make rapid edits (type fast)
2. Count number of save API calls
3. Measure save latency

**Expected Results:**
- ✅ Only 1 save call per 1000ms (debounced)
- ✅ Save completes < 300ms
- ✅ No UI blocking during save

**Pass/Fail:** ___________

### Test 5.3: Cache Effectiveness

**Steps:**
1. Load a journey CV
2. Switch to cover letter
3. Switch back to CV
4. Check Network tab

**Expected Results:**
- ✅ Journey data cached (no re-fetch)
- ✅ Job data cached
- ✅ Faster second load

**Pass/Fail:** ___________

### Test 5.4: Preview Re-render Performance

**Steps:**
1. Make rapid edits
2. Watch preview panel
3. Check console for performance warnings

**Expected Results:**
- ✅ Preview updates smoothly
- ✅ Debouncing working (300ms delay)
- ✅ No excessive re-renders
- ✅ No performance warnings

**Pass/Fail:** ___________

---

## Test Suite 6: UI/UX

### Test 6.1: Save Status Indicators

**Steps:**
1. Make an edit
2. Watch save status in top bar

**Expected Results:**
- ✅ Shows "Saving..." during save
- ✅ Shows "Saved" on success
- ✅ Shows check icon when saved
- ✅ Indicators clear and visible

**Pass/Fail:** ___________

### Test 6.2: Session Type Badges

**Steps:**
1. Test all three modes
2. Check badge display

**Expected Results:**
- ✅ Journey mode: "Journey Mode" badge
- ✅ Master CV mode: "Master CV" badge
- ✅ Standalone: No badge OR "Standalone" badge
- ✅ Badges clearly visible

**Pass/Fail:** ___________

### Test 6.3: Mode Switch Visual Feedback

**Steps:**
1. Switch between CV and cover letter
2. Observe transition

**Expected Results:**
- ✅ Loading indicator during switch
- ✅ Smooth transition
- ✅ Clear visual feedback
- ✅ No jarring UI changes

**Pass/Fail:** ___________

### Test 6.4: Error Message Display

**Steps:**
1. Trigger a save error (disconnect network)
2. Check error display

**Expected Results:**
- ✅ Error message clear and visible
- ✅ Retry button present and functional
- ✅ Error dismissible
- ✅ Non-blocking (can continue editing)

**Pass/Fail:** ___________

### Test 6.5: Keyboard Shortcuts

**Steps:**
1. Test all keyboard shortcuts:
   - Ctrl+S (Save)
   - Ctrl+E (Exit)
   - Escape (Close modals)

**Expected Results:**
- ✅ All shortcuts work
- ✅ No conflicts with browser shortcuts
- ✅ Visual feedback when triggered

**Pass/Fail:** ___________

---

## Test Suite 7: Data Integrity

### Test 7.1: Section Visibility Persistence

**Steps:**
1. Hide some CV sections
2. Save and exit
3. Reload CV

**Expected Results:**
- ✅ Hidden sections remain hidden
- ✅ Visibility state persisted
- ✅ Structure preserved

**Pass/Fail:** ___________

### Test 7.2: Template Changes Persistence

**Steps:**
1. Change template
2. Exit immediately
3. Reload CV

**Expected Results:**
- ✅ New template applied
- ✅ Template ID persisted
- ✅ All content preserved

**Pass/Fail:** ___________

### Test 7.3: Journey Link Integrity

**Steps:**
1. In journey mode, save CV
2. Check database directly or via API
3. Verify journey.cvId matches

**Expected Results:**
- ✅ Journey.cvId updated correctly
- ✅ Journey.coverLetterId updated correctly
- ✅ Links bidirectional and correct

**Pass/Fail:** ___________

### Test 7.4: Master CV Flag Preservation

**Steps:**
1. Edit master CV
2. Save multiple times
3. Check database

**Expected Results:**
- ✅ `metadata.isMaster` always true
- ✅ Never accidentally cleared
- ✅ Preserved across saves

**Pass/Fail:** ___________

---

## Test Suite 8: Integration

### Test 8.1: Navigation from Dashboard

**Steps:**
1. From dashboard, click "Edit" on CV card
2. Verify studio loads correctly

**Expected Results:**
- ✅ Correct URL generated
- ✅ Studio loads in correct mode
- ✅ CV data displays correctly

**Pass/Fail:** ___________

### Test 8.2: Navigation from Journey Card

**Steps:**
1. From dashboard journey tracker, click "Edit CV"
2. Verify journey mode loads

**Expected Results:**
- ✅ Journey mode activated
- ✅ Correct journey loaded
- ✅ Job context correct

**Pass/Fail:** ___________

### Test 8.3: Navigation from Master CV Card

**Steps:**
1. From profile or dashboard, click "Edit Master CV"
2. Verify master CV mode loads

**Expected Results:**
- ✅ Master CV mode activated
- ✅ Master CV loads
- ✅ Correct UI state (no job selector, etc.)

**Pass/Fail:** ___________

### Test 8.4: Return to Dashboard

**Steps:**
1. Edit CV in studio
2. Click "Exit"
3. Verify dashboard state

**Expected Results:**
- ✅ Returns to dashboard
- ✅ Updated CV visible in dashboard
- ✅ Thumbnail updated (if applicable)

**Pass/Fail:** ___________

---

## Test Summary

**Total Tests:** 43  
**Passed:** ___________  
**Failed:** ___________  
**Blocked:** ___________

**Pass Rate:** ___________%

---

## Critical Issues Found

List any critical issues discovered during testing:

1. _________________________________
2. _________________________________
3. _________________________________

---

## Performance Metrics

| Metric | Target | Actual | Pass/Fail |
|--------|--------|--------|-----------|
| Journey Load Time | < 500ms | _____ms | _____ |
| Master CV Load Time | < 200ms | _____ms | _____ |
| Standalone Load Time | < 300ms | _____ms | _____ |
| Save Latency | < 300ms | _____ms | _____ |
| Mode Switch Time | < 2000ms | _____ms | _____ |

---

## Browser Compatibility

Test on multiple browsers:

- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

---

## Sign-Off

**Tester Name:** _____________________  
**Date:** _____________________  
**Environment:** Development / Staging / Production  
**Overall Assessment:** Pass / Fail / Pass with Issues

**Notes:**
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________

---

## Appendix: Quick Test Commands

```bash
# Check API calls in browser console
performance.getEntriesByType('resource')
  .filter(r => r.name.includes('/api/studio/'))
  .forEach(r => console.log(r.name, r.duration + 'ms'))

# Check localStorage
console.log('Studio Data:', localStorage.getItem('studioData'))

# Check sessionStorage  
console.log('Session Data:', sessionStorage.getItem('studioSession'))

# Monitor context state (add to component)
console.log('Studio State:', state)

# Force garbage collection (Chrome DevTools)
// Performance > Memory > Collect garbage
```

