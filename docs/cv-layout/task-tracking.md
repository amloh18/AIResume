# CV Layout Engine — Task Tracking

> **Date**: 2026-08-31
> **Goal**: Fix root causes of layout/pagination gaps. Implement "upside-down Tetris" model.
> **Status**: Audit complete. Root causes identified. Ready for implementation.

---

## Status Legend
- `[x]` Complete
- `[ ]` Pending
- `[~]` In Progress
- `[!]` Blocked
- `[-]` Cancelled

---

## Phase 1: Audit (COMPLETE)

- [x] **1.1** Read architecture docs (`AGENTS.md`, design system)
- [x] **1.2** Identify all layout-related components and files
- [x] **1.3** Understand existing layout model
- [x] **1.4** Understand interaction with templates
- [x] **1.5** Map complete rendering pipeline
- [x] **1.6** Identify canvas engine and measurement system
- [x] **1.7** Identify PDF pipeline
- [x] **1.8** Identify template system (15 canvas templates + 5 V2 templates)
- [x] **1.9** Identify snippet system (13 snippet types)
- [x] **1.10** Understand page break logic
- [x] **1.11** Understand column layout
- [x] **1.12** Understand section splitting
- [x] **1.13** Understand measurement timing problem
- [x] **1.14** Understand feedback loops
- [x] **1.15** Create `docs/cv-layout/layout-engine-audit.md`
- [x] **1.16** Create `docs/cv-layout/template-layout-matrix.md`

---

## Phase 2: Layout Debug Mode (IN PROGRESS)

### 2.1 Debug Overlay Component
- [x] **2.1.1** Create `src/components/cv-builder-pro/LayoutDebugOverlay.tsx`
  - Visual overlay showing bounding boxes for all measured blocks
  - Color-coded by page (page 1 = blue, page 2 = green, etc.)
  - Show available space per page (dashed lines)
  - Show page break positions (red lines)
  - Show column dividers (gray lines)
  - Toggle via admin-only Bug icon button in canvas toolbar

### 2.2 Debug Toggle (Admin Only)
- [x] **2.2.1** Add admin/superadmin role check via `useUserData()` hook
- [x] **2.2.2** Add Bug icon toggle button in bottom-right toolbar (admin only)
- [x] **2.2.3** Restrict `?debug=layout` URL param to admin roles

### 2.2 Measurement Visualization
- [ ] **2.2.1** Add measurement data attributes to blocks
  - `data-measured-height` — Height measured by DOM
  - `data-estimated-height` — Height estimated by content
  - `data-page` — Which page block is on
  - `data-column` — Which column block is in
- [ ] **2.2.2** Add console logging for measurement
  - Log all measured heights
  - Log page break decisions
  - Log column split decisions
  - Log keep-together decisions

### 2.3 Available Space Visualization
- [ ] **2.3.1** Create page outline with available space indicator
  - Show total page height
  - Show used space (filled)
  - Show remaining space (empty)
  - Show margin boundaries
- [ ] **2.3.2** Create column space indicator
  - Show column boundaries
  - Show column height
  - Show column usage

### 2.4 Testing
- [ ] **2.4.1** Test debug overlay with all 15 templates
- [ ] **2.4.2** Test debug overlay with different content densities
- [ ] **2.4.3** Test debug overlay with column layouts
- [ ] **2.4.4** Test debug overlay with page breaks
- [ ] **2.4.5** Ensure debug mode doesn't affect production performance

---

## Phase 3: Measurement Accuracy (COMPLETE)

### 3.1 Fix Height Calculation
- [x] **3.1.1** Account for `blockMarginBottom` in height calculation
- [x] **3.1.2** Account for `blockGap` between blocks
- [x] **3.1.3** Account for `sectionGap` between sections
- [x] **3.1.4** Account for `headingMarginBottom`
- [x] **3.1.5** Account for `snippetGap` between snippets
- [x] **3.1.6** Reduce `BOTTOM_PADDING_ALLOWANCE` from 8px to template-appropriate value

### 3.2 Section Top Position Timing
- [x] **3.2.1** Fix `sectionTopPositions` calculation to avoid feedback loop
- [x] **3.2.2** Cache section top positions and update only when layout changes
- [x] **3.2.3** Add validation for section top positions

### 3.3 Measurement Validation
- [x] **3.3.1** Compare measured vs expected heights
- [x] **3.3.2** Log discrepancies
- [x] **3.3.3** Add tolerance threshold (e.g., 5% variance)
- [x] **3.3.4** Alert on measurement errors in debug mode

### 3.4 Testing
- [x] **3.4.1** Test measurement with all 15 templates
- [x] **3.4.2** Test measurement with different content densities
- [x] **3.4.3** Test measurement with column layouts
- [x] **3.4.4** Test measurement with long content (10+ entries)
- [x] **3.4.5** Ensure measurement accuracy within tolerance

### 3.5 Unified Spacing Rhythm (COMPLETE)
- [x] **3.5.1** Add CSS overrides for `mb-0`, `mb-0.5`, `mb-1`, `mb-1.5`, `mb-2`, `mb-3`, `mb-4`, `mb-6`
- [x] **3.5.2** Add CSS overrides for `pb-2`, `pb-3`, `pb-4`, `pb-5`, `pb-6`
- [x] **3.5.3** Add CSS overrides for `gap-3`, `gap-4`, `gap-5`, `gap-0.5`, `gap-y-0.5`, `gap-x-3`
- [x] **3.5.4** Route all hardcoded Tailwind spacing utilities through `--cv-spacing` token
- [x] **3.5.5** Add same overrides to CVSnapshotDocument for PDF consistency
- [x] **3.5.6** Reduce `--cv-column-gap` minimum from 24px to 8px

---

## Phase 4: Pagination Algorithm (PENDING)

### 4.1 Force Break Optimization
- [ ] **4.1.1** Cache keep-together section heights
- [ ] **4.1.2** Skip measurement if section height hasn't changed
- [ ] **4.1.3** Add early exit for sections that clearly fit
- [ ] **4.1.4** Reduce O(n²) cost for keep-together sections

### 4.2 Page Break Precision
- [ ] **4.2.1** Fix page break positions to account for margins
- [ ] **4.2.2** Fix page break positions to account for section gaps
- [ ] **4.2.3** Fix page break positions to account for heading heights
- [ ] **4.2.4** Add page break preview (show where breaks will occur)

### 4.3 Column-Aware Pagination
- [ ] **4.3.1** Calculate column height accurately
- [ ] **4.3.2** Account for section headings in column height
- [ ] **4.3.3** Account for gaps in column height
- [ ] **4.3.4** Track remaining space per column
- [ ] **4.3.5** Split content at column boundaries

### 4.4 Testing
- [ ] **4.4.1** Test pagination with all 15 templates
- [ ] **4.4.2** Test pagination with different content densities
- [ ] **4.4.3** Test pagination with column layouts
- [ ] **4.4.4** Test pagination with page breaks
- [ ] **4.4.5** Test pagination with keep-together sections
- [ ] **4.4.6** Ensure no content overlap across pages

---

## Phase 5: Content Estimation (PENDING)

### 5.1 Height Estimation
- [ ] **5.1.1** Estimate height from content structure before rendering
- [ ] **5.1.2** Use template spacing presets for estimation
- [ ] **5.1.3** Use font metrics for text estimation
- [ ] **5.1.4** Compare estimated vs measured heights
- [ ] **5.1.5** Update estimation model based on discrepancies

### 5.2 Virtual Measurement
- [ ] **5.2.1** Create off-screen measurement container
- [ ] **5.2.2** Render content off-screen
- [ ] **5.2.3** Measure heights off-screen
- [ ] **5.2.4** Use off-screen measurements for pagination
- [ ] **5.2.5** Remove off-screen container after measurement

### 5.3 Pre-Calculation
- [ ] **5.3.1** Calculate page breaks before rendering
- [ ] **5.3.2** Calculate column splits before rendering
- [ ] **5.3.3** Calculate section placement before rendering
- [ ] **5.3.4** Use pre-calculated values in render

### 5.4 Testing
- [ ] **5.4.1** Test estimation with all 15 templates
- [ ] **5.4.2** Test estimation with different content densities
- [ ] **5.4.3** Test estimation with column layouts
- [ ] **5.4.4** Test estimation with long content
- [ ] **5.4.5** Ensure estimation accuracy within tolerance

---

## Phase 6: Template-Aware Spacing (PENDING)

### 6.1 V2 Template Spacing
- [ ] **6.1.1** Use V2 template spacing presets in canvas measurement
- [ ] **6.1.2** Use V2 template spacing presets in pagination
- [ ] **6.1.3** Use V2 template spacing presets in column height calculation
- [ ] **6.1.4** Validate V2 template spacing in debug mode

### 6.2 Section Design Overrides
- [ ] **6.2.1** Account for `sectionDesignOverrides` in measurement
- [ ] **6.2.2** Account for padding, margins, borders in overrides
- [ ] **6.2.3** Account for background color height in overrides
- [ ] **6.2.4** Validate overrides in debug mode

### 6.3 Template-Specific Spacing
- [ ] **6.3.1** Define spacing for each template category (default, side-accent, stacked, two-column)
- [ ] **6.3.2** Use category-specific spacing in measurement
- [ ] **6.3.3** Validate category spacing in debug mode

### 6.4 Testing
- [ ] **6.4.1** Test spacing with all 15 templates
- [ ] **6.4.2** Test spacing with different content densities
- [ ] **6.4.3** Test spacing with column layouts
- [ ] **6.4.4** Test spacing with V2 templates
- [ ] **6.4.5** Ensure spacing matches template design

---

## Phase 7: Upside-Down Tetris Model (PENDING)

### 7.1 Available Space Tracking
- [ ] **7.1.1** Create `AvailableSpaceTracker` class
  - Track remaining space per page
  - Track remaining space per column
  - Support page breaks
  - Support column breaks
- [ ] **7.1.2** Initialize tracker with page dimensions
  - Use template page dimensions (letter/A4)
  - Subtract margins
  - Subtract header/footer if any
- [ ] **7.1.3** Update tracker as content is placed
  - Subtract block height
  - Subtract gaps (section, block, snippet)
  - Subtract heading height

### 7.2 Block Placement Algorithm
- [ ] **7.2.1** Create `BlockPlacer` class
  - Place blocks in available space
  - Split blocks if necessary
  - Respect keep-together rules
  - Respect column boundaries
- [ ] **7.2.2** Implement block-level splitting
  - Split text blocks at line boundaries
  - Split list blocks at item boundaries
  - Split section blocks at snippet boundaries
- [ ] **7.2.3** Implement column-aware placement
  - Place blocks in columns
  - Track column usage
  - Move to next column when current is full
  - Move to next page when all columns are full

### 7.3 Section Placement Algorithm
- [ ] **7.3.1** Create `SectionPlacer` class
  - Place sections in available space
  - Respect keep-together rules
  - Respect section ordering
  - Respect section weights
- [ ] **7.3.2** Implement keep-together placement
  - Measure entire section height
  - Place entire section if it fits
  - Move entire section to next page if it doesn't fit
- [ ] **7.3.3** Implement split placement
  - Place section start on current page
  - Continue section on next page
  - Maintain content continuity

### 7.4 Page Assembly
- [ ] **7.4.1** Create `PageAssembler` class
  - Assemble pages from placed blocks/sections
  - Apply page breaks
  - Apply column dividers
  - Apply margins
- [ ] **7.4.2** Implement page break application
  - Force breaks at specified positions
  - Natural breaks at section boundaries
  - Column breaks at column boundaries
- [ ] **7.4.3** Implement margin application
  - Top margin
  - Bottom margin
  - Left margin
  - Right margin

### 7.5 Testing
- [ ] **7.5.1** Test placement with all 15 templates
- [ ] **7.5.2** Test placement with different content densities
- [ ] **7.5.3** Test placement with column layouts
- [ ] **7.5.4** Test placement with page breaks
- [ ] **7.5.5** Test placement with keep-together sections
- [ ] **7.5.6** Test placement with block splitting
- [ ] **7.5.7** Ensure no content overlap
- [ ] **7.5.8** Ensure no content cut off

---

## Phase 8: PDF Pipeline Alignment (PENDING)

### 8.1 PDF vs Canvas Consistency
- [ ] **8.1.1** Compare PDF output vs canvas output
- [ ] **8.1.2** Identify discrepancies
- [ ] **8.1.3** Fix discrepancies
- [ ] **8.1.4** Add validation tests

### 8.2 PDF Measurement
- [ ] **8.2.1** Measure PDF content heights
- [ ] **8.2.2** Compare PDF measurements vs canvas measurements
- [ ] **8.2.3** Fix measurement differences
- [ ] **8.2.4** Add measurement validation

### 8.3 PDF Pagination
- [ ] **8.3.1** Compare PDF pagination vs canvas pagination
- [ ] **8.3.2** Identify pagination differences
- [ ] **8.3.3** Fix pagination differences
- [ ] **8.3.4** Add pagination validation

### 8.4 Testing
- [ ] **8.4.1** Test PDF with all 15 templates
- [ ] **8.4.2** Test PDF with different content densities
- [ ] **8.4.3** Test PDF with column layouts
- [ ] **8.4.4** Test PDF with page breaks
- [ ] **8.4.5** Ensure PDF matches canvas layout

---

## Phase 9: Regression Tests (PENDING)

### 9.1 Unit Tests
- [ ] **9.1.1** Test measurement accuracy
- [ ] **9.1.2** Test page break logic
- [ ] **9.1.3** Test column splitting
- [ ] **9.1.4** Test keep-together logic
- [ ] **9.1.5** Test content estimation

### 9.2 Integration Tests
- [ ] **9.2.1** Test full rendering pipeline
- [ ] **9.2.2** Test all 15 templates
- [ ] **9.2.3** Test all content densities
- [ ] **9.2.4** Test all layout patterns
- [ ] **9.2.5** Test PDF export

### 9.3 Visual Regression Tests
- [ ] **9.3.1** Capture screenshots of all templates
- [ ] **9.3.2** Compare screenshots across runs
- [ ] **9.3.3** Detect visual regressions
- [ ] **9.3.4** Update baseline screenshots

### 9.4 Performance Tests
- [ ] **9.4.1** Measure rendering time
- [ ] **9.4.2** Measure measurement time
- [ ] **9.4.3** Measure pagination time
- [ ] **9.4.4** Identify performance bottlenecks
- [ ] **9.4.5** Optimize performance

### 9.5 Edge Case Tests
- [ ] **9.5.1** Test very long content (10+ entries)
- [ ] **9.5.2** Test very short content (1 entry)
- [ ] **9.5.3** Test empty sections
- [ ] **9.5.4** Test missing data
- [ ] **9.5.5** Test invalid data

---

## Phase 10: Documentation (PENDING)

### 10.1 Architecture Documentation
- [ ] **10.1.1** Document layout engine architecture
- [ ] **10.1.2** Document measurement system
- [ ] **10.1.3** Document pagination algorithm
- [ ] **10.1.4** Document column layout
- [ ] **10.1.5** Document template system

### 10.2 API Documentation
- [ ] **10.2.1** Document CVCanvasEngine props
- [ ] **10.2.2** Document measurement callbacks
- [ ] **10.2.3** Document pagination callbacks
- [ ] **10.2.4** Document debug mode API

### 10.3 Testing Documentation
- [ ] **10.3.1** Document test cases
- [ ] **10.3.2** Document test fixtures
- [ ] **10.3.3** Document test execution
- [ ] **10.3.4** Document regression test process

### 10.4 Deployment Documentation
- [ ] **10.4.1** Document deployment process
- [ ] **10.4.2** Document rollback process
- [ ] **10.4.3** Document monitoring
- [ ] **10.4.4** Document troubleshooting

---

## Phase 11: Dense Layout Template (COMPLETE)

### 11.1 Minimalist Single Dense Layout
- [x] **11.1.1** Update "Minimalist Single" template definition with dense settings:
  - `preferredSectionGap: 1`
  - `preferredItemGap: 1`
  - `preferredSpacing: 0.625` (gives line-height 1.0x)
  - `preferredFontSize: 10.5`
  - `preferredPageMargin: 30`
- [x] **11.1.2** Update `loadTemplate` to apply `preferredSpacing`, `preferredFontSize`, `preferredPageMargin`
- [x] **11.1.3** Modify `header-minimal` snippet:
  - Remove `border-b` (bottom border)
  - Remove `uppercase tracking-widest` from name
  - Reduce gap/padding values for density
- [x] **11.1.4** Add CSS overrides for all hardcoded Tailwind spacing utilities to respect `--cv-spacing`
- [x] **11.1.5** Reduce `--cv-column-gap` minimum from 24px to 8px
- [x] **11.1.6** Add matching CSS overrides to CVSnapshotDocument for PDF consistency
- [x] **11.1.7** TypeScript check passes (0 errors)

---

## Phase 12: PDF Icon Alignment (PENDING)

### 12.1 Contact Icon Alignment
- [ ] **12.1.1** Investigate PDF vs canvas icon rendering differences
- [ ] **12.1.2** Fix contact icons (location, phone, email, linkedin, link) vertical alignment in PDF
- [ ] **12.1.3** Fix section heading icons vertical alignment in PDF
- [ ] **12.1.4** Validate PDF output matches canvas rendering

---

## Priority Order

### High Priority (Fix Measurement)
1. Phase 3: Measurement Accuracy (3.1-3.6) ✅
2. Phase 4: Pagination Algorithm (4.1-4.4)
3. Phase 2: Layout Debug Mode (2.1-2.4) [~]

### Medium Priority (Improve Pagination)
4. Phase 6: Template-Aware Spacing (6.1-6.4)
5. Phase 5: Content Estimation (5.1-5.4)
6. Phase 8: PDF Pipeline Alignment (8.1-8.4)
7. Phase 11: Dense Layout Template ✅
8. Phase 12: PDF Icon Alignment (12.1)

### Low Priority (Upside-Down Tetris)
9. Phase 7: Upside-Down Tetris Model (7.1-7.5)
10. Phase 9: Regression Tests (9.1-9.5)
11. Phase 10: Documentation (10.1-10.4)

---

## Estimated Effort

| Phase | Effort | Dependencies |
|-------|--------|--------------|
| Phase 1: Audit | Complete | — |
| Phase 2: Debug Mode | 2-3 days | Phase 1 |
| Phase 3: Measurement | 3-5 days | Phase 1 |
| Phase 4: Pagination | 5-7 days | Phase 3 |
| Phase 5: Content Estimation | 7-10 days | Phase 3, 4 |
| Phase 6: Template Spacing | 3-5 days | Phase 3 |
| Phase 7: Upside-Down Tetris | 10-15 days | Phase 3, 4, 5, 6 |
| Phase 8: PDF Alignment | 5-7 days | Phase 3, 4 |
| Phase 9: Regression Tests | 5-7 days | Phase 2, 3, 4, 5, 6, 7, 8 |
| Phase 10: Documentation | 3-5 days | Phase 2, 3, 4, 5, 6, 7, 8, 9 |

**Total estimated effort**: 43-64 days (single developer)

---

## Success Criteria

### Phase 2 Success
- [ ] Debug overlay shows all measured blocks
- [ ] Debug overlay shows available space
- [ ] Debug overlay shows page breaks
- [ ] Debug overlay shows column dividers
- [ ] Debug mode doesn't affect production performance

### Phase 3 Success
- [ ] Height calculation accounts for all spacing
- [ ] Section top positions don't create feedback loops
- [ ] Measurement accuracy within 5% tolerance
- [ ] No measurement errors in debug mode

### Phase 4 Success
- [ ] Force breaks are optimized (no O(n²) for keep-together)
- [ ] Page breaks are precise (account for margins, gaps, headings)
- [ ] Column height is accurate
- [ ] No content overlap across pages

### Phase 5 Success
- [ ] Height estimation within 10% tolerance
- [ ] Virtual measurement works correctly
- [ ] Pre-calculation reduces rendering time
- [ ] No layout shift after render

### Phase 6 Success
- [ ] V2 template spacing used in measurement
- [ ] Section design overrides accounted for
- [ ] Template category spacing applied
- [ ] Spacing matches template design

### Phase 7 Success
- [ ] Available space tracking works correctly
- [ ] Block placement respects keep-together rules
- [ ] Column-aware placement works correctly
- [ ] Page assembly produces correct output
- [ ] No content overlap or cut off

### Phase 8 Success
- [ ] PDF matches canvas layout
- [ ] PDF measurement matches canvas measurement
- [ ] PDF pagination matches canvas pagination
- [ ] No visual differences between PDF and canvas

### Phase 9 Success
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All visual regression tests pass
- [ ] All performance tests pass
- [ ] All edge case tests pass

### Phase 10 Success
- [ ] Architecture documented
- [ ] API documented
- [ ] Tests documented
- [ ] Deployment documented
