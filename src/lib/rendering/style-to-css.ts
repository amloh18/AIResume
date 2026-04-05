/**
 * Style Preset → CSS Generator
 *
 * Converts a StylePreset into injectable CSS string.
 * Used by both the live preview and Puppeteer PDF export.
 */

import type { StylePreset } from '@/types/template-v2';

export function generateCSSFromPreset(preset: StylePreset): string {
  const { typography, spacing, colors, layout, bullets } = preset;

  return `
/* ─── Generated from Style Preset: ${preset.name} ─── */

:root {
  --cv-primary: ${colors.primary};
  --cv-secondary: ${colors.secondary};
  --cv-text: ${colors.text};
  --cv-heading: ${colors.heading};
  --cv-muted: ${colors.muted};
  --cv-bg: ${colors.background};
  --cv-accent: ${colors.accent};
  --cv-section-gap: ${spacing.sectionGap};
  --cv-item-gap: ${spacing.itemGap};
  --cv-bullet-gap: ${spacing.bulletGap};
  --cv-para-gap: ${spacing.paragraphGap};
  --cv-header-padding: ${spacing.headerPadding};
}

/* ─── TYPOGRAPHY ─── */
.cv-section-heading {
  font-size: ${typography.sectionHeading.fontSize};
  font-weight: ${typography.sectionHeading.fontWeight};
  ${typography.sectionHeading.textTransform ? `text-transform: ${typography.sectionHeading.textTransform};` : ''}
  ${typography.sectionHeading.letterSpacing ? `letter-spacing: ${typography.sectionHeading.letterSpacing};` : ''}
  line-height: ${typography.sectionHeading.lineHeight};
  color: var(--cv-heading);
  margin-bottom: ${spacing.itemGap};
}

.cv-job-title {
  font-size: ${typography.jobTitle.fontSize};
  font-weight: ${typography.jobTitle.fontWeight};
  line-height: ${typography.jobTitle.lineHeight};
  color: var(--cv-heading);
}

.cv-company-date {
  font-size: ${typography.companyDate.fontSize};
  font-weight: ${typography.companyDate.fontWeight};
  ${typography.companyDate.fontStyle ? `font-style: ${typography.companyDate.fontStyle};` : ''}
  line-height: ${typography.companyDate.lineHeight};
  color: var(--cv-muted);
}

.cv-body-text {
  font-size: ${typography.bodyText.fontSize};
  font-weight: ${typography.bodyText.fontWeight};
  line-height: ${typography.bodyText.lineHeight};
  color: var(--cv-text);
}

.cv-contact-info {
  font-size: ${typography.contactInfo.fontSize};
  font-weight: ${typography.contactInfo.fontWeight};
  line-height: ${typography.contactInfo.lineHeight};
  color: var(--cv-text);
}

.cv-skill-tag {
  font-size: ${typography.skillTag.fontSize};
  font-weight: ${typography.skillTag.fontWeight};
  ${typography.skillTag.textTransform ? `text-transform: ${typography.skillTag.textTransform};` : ''}
  ${typography.skillTag.letterSpacing ? `letter-spacing: ${typography.skillTag.letterSpacing};` : ''}
  line-height: ${typography.skillTag.lineHeight};
}

/* ─── SPACING ─── */
.cv-section {
  margin-bottom: var(--cv-section-gap);
}

.cv-item {
  margin-bottom: var(--cv-item-gap);
}

.cv-bullet {
  margin-bottom: var(--cv-bullet-gap);
}

.cv-paragraph {
  margin-bottom: var(--cv-para-gap);
}

/* ─── LAYOUT ─── */
${layout.sectionTitleDecoration === 'bordered' ? `
.cv-section-heading {
  border-bottom: 2px solid var(--cv-primary);
  padding-bottom: 4px;
}` : ''}

${layout.sectionTitleDecoration === 'accent-bar' ? `
.cv-section-heading {
  border-left: 4px solid var(--cv-accent);
  padding-left: 8px;
}` : ''}

${layout.sectionTitleDecoration === 'spaced' ? `
.cv-section-heading::after {
  content: '';
  display: block;
  width: 60px;
  height: 2px;
  background: var(--cv-accent);
  margin-top: 4px;
}` : ''}

${layout.twoThirdsRule ? `
.cv-highlights, .cv-summary-text {
  max-width: 75%;
}` : ''}

/* ─── BULLETS ─── */
.cv-bullet-list {
  padding-left: ${bullets.indent};
  list-style: none;
}

.cv-bullet-list li::before {
  content: '${bullets.character}';
  color: var(--cv-accent);
  margin-right: 6px;
}

${bullets.orphanPrevention ? `
.cv-bullet-list li {
  orphans: 2;
  widows: 2;
  break-inside: avoid;
}` : ''}

/* ─── CONTACT DISPLAY ─── */
${layout.contactDisplay === 'inline-bar' ? `
.cv-contact-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.cv-contact-bar .cv-contact-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.cv-contact-bar .cv-contact-separator {
  color: var(--cv-muted);
}` : ''}

${layout.contactDisplay === 'stacked' ? `
.cv-contact-bar {
  display: flex;
  flex-direction: column;
  gap: 4px;
}` : ''}

/* ─── FORMAT HINTS ─── */
.cv-emphasis {
  font-weight: bold;
  color: var(--cv-heading);
}

.cv-metric {
  font-weight: bold;
  color: var(--cv-accent);
}

.cv-keyword-highlight {
  background: color-mix(in srgb, var(--cv-accent) 10%, transparent);
  padding: 0 2px;
  border-radius: 2px;
}

/* ─── PRINT ─── */
@media print {
  .cv-section { break-inside: avoid; }
  .cv-item { break-inside: avoid; }
  .cv-section-heading { break-after: avoid; }
}
`;
}

/**
 * Generate inline style object from preset for React components.
 */
export function generateInlineStyles(preset: StylePreset): Record<string, React.CSSProperties> {
  const { typography, spacing, colors } = preset;

  return {
    sectionHeading: {
      fontSize: typography.sectionHeading.fontSize,
      fontWeight: typography.sectionHeading.fontWeight as any,
      textTransform: typography.sectionHeading.textTransform as any,
      letterSpacing: typography.sectionHeading.letterSpacing,
      lineHeight: typography.sectionHeading.lineHeight,
      color: colors.heading,
      marginBottom: spacing.itemGap,
    },
    jobTitle: {
      fontSize: typography.jobTitle.fontSize,
      fontWeight: typography.jobTitle.fontWeight as any,
      lineHeight: typography.jobTitle.lineHeight,
      color: colors.heading,
    },
    companyDate: {
      fontSize: typography.companyDate.fontSize,
      fontWeight: typography.companyDate.fontWeight as any,
      fontStyle: typography.companyDate.fontStyle as any,
      lineHeight: typography.companyDate.lineHeight,
      color: colors.muted,
    },
    bodyText: {
      fontSize: typography.bodyText.fontSize,
      fontWeight: typography.bodyText.fontWeight as any,
      lineHeight: typography.bodyText.lineHeight,
      color: colors.text,
    },
  };
}
