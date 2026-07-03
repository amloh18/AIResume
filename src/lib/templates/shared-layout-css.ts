/**
 * Shared CSS Generator for CV Layout Rules
 *
 * Generates CSS strings from the shared layout rules schema.
 * Used by both section components (inline <style>) and custom renderers.
 */

import {
  LayoutRules,
  TypographyRules,
  EdgeCaseRules,
  CVLayoutRules,
} from '@/lib/validation/cv-layout-rules';
import { DEFAULT_CV_LAYOUT_RULES } from '@/lib/validation/default-rules';

// ─── CSS GENERATION ───────────────────────────────────────

export function generateEnforcedCSS(rules?: Partial<CVLayoutRules>): string {
  const layout = rules?.layout ?? DEFAULT_CV_LAYOUT_RULES.layout;
  const typography = rules?.typography ?? DEFAULT_CV_LAYOUT_RULES.typography;
  const edgeCases = rules?.edgeCases ?? DEFAULT_CV_LAYOUT_RULES.edgeCases;

  return [
    generateDateTitleAnchorCSS(layout),
    generateTwoThirdsCSS(layout),
    generateVerticalRhythmCSS(layout),
    generatePageBreakCSS(layout),
    generateKeepWithNextCSS(),
    generateOrphanPreventionCSS(layout),
    generateEmptyStateCSS(edgeCases),
    generateURLShorteningCSS(edgeCases),
    generateSkillsFormattingCSS(edgeCases),
    generateTypographyCSS(typography),
    generateContactInfoCSS(layout),
  ].join('\n');
}

// ─── DATE-TITLE ANCHOR ────────────────────────────────────

function generateDateTitleAnchorCSS(layout: LayoutRules): string {
  if (!layout.dateTitleAnchor.enabled) return '';

  return `
/* ─── DATE-TITLE ANCHOR ──────────────────────────────────── */
.entry-header,
.item-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 16px;
}
.item-date-group {
  white-space: nowrap;
  ${layout.dateTitleAnchor.dateFlexShrink ? 'flex-shrink: 0;' : ''}
  text-align: right;
}
.item-title-group {
  flex: 1;
  min-width: 0;
  ${layout.dateTitleAnchor.titleTruncation === 'ellipsis' ? 'overflow: hidden; text-overflow: ellipsis;' : ''}
}
`.trim();
}

// ─── TWO-THIRDS RULE ─────────────────────────────────────

function generateTwoThirdsCSS(layout: LayoutRules): string {
  if (!layout.twoThirds.enabled) return '';

  return `
/* ─── TWO-THIRDS RULE ────────────────────────────────────── */
.item-summary,
.item-highlights,
.entry-content,
.item-content {
  max-width: ${layout.twoThirds.maxWidthPercent}%;
}
`.trim();
}

// ─── VERTICAL RHYTHM ─────────────────────────────────────

function generateVerticalRhythmCSS(layout: LayoutRules): string {
  return `
/* ─── VERTICAL RHYTHM ────────────────────────────────────── */
.section-content {
  margin-bottom: ${layout.verticalRhythm.sectionSpacing};
}
.experience-list,
.education-list,
.projects-list,
.volunteer-list,
.awards-list,
.publications-list,
.certificates-list,
.entry-list {
  display: flex;
  flex-direction: column;
  gap: ${layout.verticalRhythm.itemSpacing};
}
`.trim();
}

// ─── PAGE BREAKS ──────────────────────────────────────────

function generatePageBreakCSS(layout: LayoutRules): string {
  return `
/* ─── PAGE BREAKS ────────────────────────────────────────── */
/* Canvas/jsPDF screen-mode page break enforcement */
${layout.pageBreaks.preventOrphanedHeaders ? `.section-header,
.cv-section-header {
  break-after: avoid;
  page-break-after: avoid;
}` : ''}
${layout.pageBreaks.preventSplitEntries ? `.experience-item,
.education-item,
.project-item,
.volunteer-item,
.award-item,
.publication-item,
.certificate-item,
.cv-entry-item,
.entry-block {
  break-inside: avoid;
  page-break-inside: avoid;
}` : ''}
@media print {
  ${layout.pageBreaks.preventOrphanedHeaders ? `
  .section-header,
  .cv-section-header {
    break-after: avoid;
  }` : ''}
  ${layout.pageBreaks.preventSplitEntries ? `
  .experience-item,
  .education-item,
  .project-item,
  .volunteer-item,
  .award-item,
  .publication-item,
  .certificate-item,
  .cv-entry-item,
  .entry-block {
    break-inside: avoid;
    page-break-inside: avoid;
  }` : ''}
  .section-content {
    break-before: auto;
  }
}
`.trim();
}

// ─── KEEP-WITH-NEXT ──────────────────────────────────────

function generateKeepWithNextCSS(): string {
  return `
/* ─── KEEP-WITH-NEXT ─────────────────────────────────────── */
.cv-keep-with-next {
  break-after: avoid;
  page-break-after: avoid;
}
`.trim();
}

// ─── ORPHAN PREVENTION ───────────────────────────────────

function generateOrphanPreventionCSS(layout: LayoutRules): string {
  if (!layout.orphanPrevention.enabled) return '';

  const { orphans, widows } = layout.orphanPrevention;

  return `
/* ─── ORPHAN PREVENTION ──────────────────────────────────── */
.bullet-point,
.item-summary p,
.volunteer-summary p,
.project-description p,
.award-summary p,
.publication-summary p {
  orphans: ${orphans};
  widows: ${widows};
}
.experience-item,
.education-item,
.project-item,
.volunteer-item,
.award-item,
.publication-item,
.certificate-item,
.cv-entry-item {
  orphans: ${orphans + 1};
  widows: ${widows};
}
`.trim();
}

// ─── EMPTY STATE HANDLING ────────────────────────────────

function generateEmptyStateCSS(edgeCases: EdgeCaseRules): string {
  if (!edgeCases.emptyStates.hideEmptyFields) return '';

  return `
/* ─── EMPTY STATE HANDLING ───────────────────────────────── */
.cv-separator:empty,
.cv-separator + :empty,
.field-separator:empty {
  display: none;
}
`.trim();
}

// ─── URL SHORTENING ──────────────────────────────────────

function generateURLShorteningCSS(edgeCases: EdgeCaseRules): string {
  if (!edgeCases.urlHandling.shortenLongURLs) return '';

  return `
/* ─── URL SHORTENING ─────────────────────────────────────── */
.url-display,
.contact-link {
  max-width: ${edgeCases.urlHandling.maxDisplayLength}ch;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: inline-block;
  vertical-align: bottom;
}
`.trim();
}

// ─── SKILLS FORMATTING ──────────────────────────────────

function generateSkillsFormattingCSS(edgeCases: EdgeCaseRules): string {
  const parts: string[] = ['/* ─── SKILLS FORMATTING ──────────────────────────────────── */'];

  if (edgeCases.skillsFormatting.noWrapSkillNames) {
    parts.push(`
.skill-name,
.skill-tag {
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: normal;
}`);
  }

  if (edgeCases.skillsFormatting.displayAs === 'comma-separated') {
    parts.push(`
.skill-list {
  display: inline;
}`);
  }

  parts.push(`
.skill-category-title {
  font-weight: 700;
  margin-right: 6px;
}`);

  return parts.join('\n');
}

// ─── TYPOGRAPHY ──────────────────────────────────────────

function generateTypographyCSS(typography: TypographyRules): string {
  const parts: string[] = ['/* ─── TYPOGRAPHY ────────────────────────────────────────── */'];

  if (typography.sectionHeaderConsistency.enforceSameCasing === 'uppercase') {
    parts.push(`
.section-header,
.cv-section-header {
  text-transform: uppercase;
}`);
  }

  return parts.join('\n');
}

// ─── CONTACT INFO ────────────────────────────────────────

function generateContactInfoCSS(layout: LayoutRules): string {
  const parts: string[] = ['/* ─── CONTACT INFO ──────────────────────────────────────── */'];

  if (layout.contactInfo.noWrapFields.includes('email')) {
    parts.push(`
.contact-link[href^="mailto:"] {
  white-space: nowrap;
}`);
  }

  if (layout.contactInfo.noWrapFields.includes('url')) {
    parts.push(`
.contact-link[href^="http"] {
  white-space: nowrap;
}`);
  }

  return parts.join('\n');
}

// ─── UTILITY: INJECT ENFORCED CSS INTO EXISTING STYLE ────

/**
 * Appends enforced CSS to an existing CSS string.
 * Use this in section components that already have inline <style> blocks.
 */
export function appendEnforcedCSS(
  existingCSS: string,
  rules?: Partial<CVLayoutRules>
): string {
  return existingCSS + '\n' + generateEnforcedCSS(rules);
}

/**
 * Returns CSS variables derived from layout rules.
 * Can be injected as :root or container-level CSS variables.
 */
export function generateLayoutCSSVariables(rules?: Partial<CVLayoutRules>): string {
  const layout = rules?.layout ?? DEFAULT_CV_LAYOUT_RULES.layout;

  return `
:root {
  --cv-section-spacing: ${layout.verticalRhythm.sectionSpacing};
  --cv-item-spacing: ${layout.verticalRhythm.itemSpacing};
  --cv-max-summary-width: ${layout.twoThirds.maxWidthPercent}%;
  --cv-orphans: ${layout.orphanPrevention.orphans};
  --cv-widows: ${layout.orphanPrevention.widows};
}
`.trim();
}
