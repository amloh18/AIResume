# Implementation Plan

## Summary
This plan addresses the UI layout issues (inconsistent section gaps, too much gap between header and columns, flowing sections), separates icon toggles for contacts and headers, ensures design values are saved, and fixes the "Failed to save CV" error.

## Current State Analysis
1. **Section Gaps**: The CSS variable `--cv-section-gap` is injected, but `DraggableSnippet` excludes header snippets from receiving this gap, while `StaticLayoutRenderer` includes it. Additionally, header snippets in `registry.tsx` have hardcoded margins (`mb-4`, `mb-5`), causing double gaps or inconsistent spacing.
2. **Icons**: `showHeaderIcons` and `showContactIcons` are already present in the design state and UI, but their usage needs to be strictly separated in snippet rendering.
3. **Failed to Save CV**: When the frontend loses the `cvId` for a Master CV (e.g., when transitioning from an onboarding flow or due to a state reset), it attempts to `POST` to `/api/cvs`. If the user already has a Master CV, the backend returns a `409 Conflict` with `existingMasterCVId`, which the frontend currently treats as a generic "Failed to save CV" error.
4. **Design Values Saving**: The `design` state is correctly merged into `cvData.metadata` in `CVCanvasEngine.tsx` and bridged in `CVBuilderProAdapter.tsx`. The issue is simply that the save fails entirely due to the `409 Conflict`, so the updated design is never persisted.

## Proposed Changes

### 1. Fix Section Gaps in `CoreUI.tsx`
- **File**: `src/components/cv-builder-pro/components/CoreUI.tsx`
- **What**: Remove the `!isHeader` condition for `marginBottom` in the `DraggableSnippet` component.
- **Why**: Ensures that the dynamic slider gap (`--cv-section-gap`) applies uniformly to ALL snippets, including the gap between the header and the main columns.

### 2. Remove Hardcoded Margins in `registry.tsx`
- **File**: `src/components/cv-builder-pro/registry.tsx`
- **What**: Remove hardcoded `mb-4`, `mb-5` utility classes from the root wrapper `div` of all `header-*` snippets.
- **Why**: Prevents double-margin issues where both the snippet and the wrapper apply a gap, ensuring the slider strictly controls the spacing.

### 3. Handle 409 Conflict in `ResumeEnhancerContainer.tsx`
- **File**: `src/components/resume-enhancer/ResumeEnhancerContainer.tsx`
- **What**: Intercept the `409 Conflict` response in `handleSmartSave`. If `result.existingMasterCVId` is returned during a `POST`, update the `cvId` state, adjust the URL via `history.replaceState`, and immediately retry the request as a `PUT` to `/api/cvs/${existingMasterCVId}`.
- **Why**: Fixes the "Failed to save CV" error by automatically recovering from missing ID states and seamlessly updating the existing Master CV instead of failing.

## Assumptions & Decisions
- The design values are already correctly placed inside `cvData.metadata.canvasDesign` by `CVCanvasEngine` and `CVBuilderProAdapter`. Fixing the save failure will naturally fix the design saving issue.
- We assume `cvData.metadata` is not stripped by the backend `sanitizeCVData` function (verified in code exploration).

## Verification Steps
1. Adjust the "Section Gap" slider in the Global Design tab and verify the gap between the header and columns changes accordingly without double spacing.
2. Toggle "Header Icons" and "Contact Icons" separately and ensure they work independently.
3. Save the CV when editing the Master CV and verify the "Failed to save CV" toast no longer appears, and changes are successfully persisted.