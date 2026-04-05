/**
 * Slot Renderers — One per SlotType
 *
 * Each renderer receives SnippetV2.content + SlotConstraints + StylePreset + FormatHints
 * Template decides visual treatment, snippet provides content.
 */

import React from 'react';
import type { StylePreset, SlotConstraints } from '@/types/template-v2';
import type {
  SnippetV2, HeaderContent, SummaryContent, ExperienceContent,
  EducationContent, SkillsContent, ProjectContent, CertificationContent,
  PublicationContent, LanguageContent, AwardContent, VolunteerContent,
  InterestContent, ReferenceContent, FormatHints,
} from '@/types/snippet-v2';

interface SlotRendererProps {
  snippet: SnippetV2;
  constraints: SlotConstraints;
  style: StylePreset;
  dateFormat?: string;
}

// ─── FORMAT HINTS RENDERER ───────────────────────────────

function renderWithHints(text: string, hints: FormatHints, style: StylePreset): React.ReactNode {
  if (!text) return null;

  let result: React.ReactNode[] = [text];
  const accentColor = style.colors.accent;
  const headingColor = style.colors.heading;

  // Emphasize words
  if (hints.emphasize?.length) {
    result = result.flatMap((part, i) => {
      if (typeof part !== 'string') return [part];
      const parts: React.ReactNode[] = [];
      let remaining = part;
      for (const word of hints.emphasize!) {
        const idx = remaining.toLowerCase().indexOf(word.toLowerCase());
        if (idx >= 0) {
          if (idx > 0) parts.push(remaining.slice(0, idx));
          parts.push(
            <strong key={`e-${i}-${word}`} style={{ color: headingColor, fontWeight: 'bold' }}>
              {remaining.slice(idx, idx + word.length)}
            </strong>
          );
          remaining = remaining.slice(idx + word.length);
        }
      }
      if (remaining) parts.push(remaining);
      return parts;
    });
  }

  // Highlight metrics
  if (hints.metrics?.length) {
    result = result.flatMap((part, i) => {
      if (typeof part !== 'string') return [part];
      let replaced = part;
      for (const metric of hints.metrics!) {
        replaced = replaced.replace(
          new RegExp(metric.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
          `__METRIC_${i}_${metric}__`
        );
      }
      const segments = replaced.split(/(__METRIC_\d+_[^_]+__)/);
      return segments.map((seg, j) => {
        const match = seg.match(/__METRIC_\d+_(.+)__/);
        if (match) {
          return (
            <span key={`m-${i}-${j}`} style={{ fontWeight: 'bold', color: accentColor }}>
              {match[1]}
            </span>
          );
        }
        return seg || null;
      });
    });
  }

  return <>{result}</>;
}

// ─── DATE FORMATTING ─────────────────────────────────────

function formatDate(dateStr: string, format: string = 'MMM_YYYY'): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;

    switch (format) {
      case 'MM_YYYY':
        return `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
      case 'FULL_MONTH':
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      case 'ISO':
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      case 'MMM_YYYY':
      default:
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }
  } catch {
    return dateStr;
  }
}

// ─── SLOT RENDERERS ──────────────────────────────────────

export function HeaderSlotRenderer({ snippet, style }: SlotRendererProps) {
  const c = snippet.content as HeaderContent;
  const contactItems = [
    c.email && { label: c.email, href: `mailto:${c.email}` },
    c.phone && { label: c.phone, href: `tel:${c.phone}` },
    c.location?.city && { label: [c.location.city, c.location.region, c.location.countryCode].filter(Boolean).join(', ') },
    c.url && { label: c.url, href: c.url },
  ].filter(Boolean);

  return (
    <div className="cv-header" style={{ padding: style.spacing.headerPadding }}>
      <h1 style={{
        fontSize: style.typography.sectionHeading.fontSize === '13pt' ? '22pt' : '20pt',
        fontWeight: 'bold',
        color: style.colors.heading,
        margin: 0,
      }}>
        {c.name}
      </h1>
      {c.label && (
        <div style={{ ...style.typography.companyDate, color: style.colors.secondary, marginTop: '4px' }}>
          {c.label}
        </div>
      )}
      <div className="cv-contact-bar" style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        marginTop: '8px',
        ...style.typography.contactInfo,
      }}>
        {contactItems.map((item: any, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span style={{ color: style.colors.muted }}>|</span>}
            {item.href ? (
              <a href={item.href} style={{ color: style.colors.accent, textDecoration: 'none' }}>
                {item.label}
              </a>
            ) : (
              <span>{item.label}</span>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

export function SummarySlotRenderer({ snippet, style }: SlotRendererProps) {
  const c = snippet.content as SummaryContent;
  return (
    <div className="cv-section cv-summary">
      <div className="cv-section-heading" style={{
        fontSize: style.typography.sectionHeading.fontSize,
        fontWeight: style.typography.sectionHeading.fontWeight as any,
        textTransform: style.typography.sectionHeading.textTransform as any,
        borderBottom: style.layout.sectionTitleDecoration === 'bordered' ? `2px solid ${style.colors.primary}` : undefined,
        paddingBottom: '4px',
        marginBottom: style.spacing.itemGap,
        color: style.colors.heading,
      }}>
        Summary
      </div>
      <div className="cv-body-text cv-paragraph" style={{
        ...style.typography.bodyText,
        color: style.colors.text,
      }}>
        {renderWithHints(c.text, snippet.formatHints, style)}
      </div>
    </div>
  );
}

export function ExperienceSlotRenderer({ snippet, style }: SlotRendererProps) {
  const c = snippet.content as ExperienceContent;
  const dateFormat = style.layout.dateFormat;

  return (
    <div className="cv-item cv-experience">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '16px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="cv-job-title" style={style.typography.jobTitle}>{c.position}</div>
          <div className="cv-company-date" style={style.typography.companyDate}>
            {c.company}
            {c.url && <a href={c.url} style={{ color: style.colors.accent, marginLeft: '6px' }}>[link]</a>}
          </div>
        </div>
        <div style={{ whiteSpace: 'nowrap', flexShrink: 0, ...style.typography.companyDate }}>
          {formatDate(c.startDate, dateFormat)} — {c.current ? 'Present' : formatDate(c.endDate, dateFormat)}
        </div>
      </div>
      {c.summary && (
        <div className="cv-body-text cv-paragraph" style={{ ...style.typography.bodyText, marginTop: '4px' }}>
          {renderWithHints(c.summary, snippet.formatHints, style)}
        </div>
      )}
      {c.highlights?.length > 0 && (
        <ul className="cv-bullet-list" style={{ paddingLeft: style.bullets.indent, listStyle: 'none', marginTop: '4px' }}>
          {c.highlights.map((h, i) => (
            <li key={i} className="cv-bullet" style={{ ...style.typography.bodyText, marginBottom: style.spacing.bulletGap }}>
              <span style={{ color: style.colors.accent, marginRight: '6px' }}>{style.bullets.character}</span>
              {renderWithHints(h, snippet.formatHints, style)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function EducationSlotRenderer({ snippet, style }: SlotRendererProps) {
  const c = snippet.content as EducationContent;
  const dateFormat = style.layout.dateFormat;

  return (
    <div className="cv-item cv-education">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '16px' }}>
        <div style={{ flex: 1 }}>
          <div className="cv-job-title" style={style.typography.jobTitle}>{c.institution}</div>
          <div className="cv-company-date" style={style.typography.companyDate}>
            {c.studyType} in {c.area}
            {c.score && <span style={{ marginLeft: '8px' }}>GPA: {c.score}</span>}
          </div>
        </div>
        <div style={{ whiteSpace: 'nowrap', flexShrink: 0, ...style.typography.companyDate }}>
          {formatDate(c.startDate, dateFormat)} — {formatDate(c.endDate, dateFormat)}
        </div>
      </div>
      {c.courses?.length && (
        <div style={{ ...style.typography.bodyText, marginTop: '4px', color: style.colors.muted, fontSize: '9pt' }}>
          Relevant: {c.courses.join(', ')}
        </div>
      )}
    </div>
  );
}

export function SkillsSlotRenderer({ snippet, style }: SlotRendererProps) {
  const c = snippet.content as SkillsContent;

  return (
    <div className="cv-item cv-skills" style={{ marginBottom: style.spacing.itemGap }}>
      <span style={{ ...style.typography.jobTitle, marginRight: '6px' }}>{c.category}:</span>
      <span style={style.typography.bodyText}>
        {c.skills.join(', ')}
      </span>
    </div>
  );
}

export function ProjectSlotRenderer({ snippet, style }: SlotRendererProps) {
  const c = snippet.content as ProjectContent;
  const dateFormat = style.layout.dateFormat;

  return (
    <div className="cv-item cv-project">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '16px' }}>
        <div style={{ flex: 1 }}>
          <div className="cv-job-title" style={style.typography.jobTitle}>
            {c.name}
            {c.url && <a href={c.url} style={{ color: style.colors.accent, marginLeft: '6px' }}>[link]</a>}
          </div>
        </div>
        {(c.startDate || c.endDate) && (
          <div style={{ whiteSpace: 'nowrap', flexShrink: 0, ...style.typography.companyDate }}>
            {c.startDate && formatDate(c.startDate, dateFormat)}
            {c.endDate && ` — ${formatDate(c.endDate, dateFormat)}`}
          </div>
        )}
      </div>
      {c.description && (
        <div className="cv-body-text cv-paragraph" style={{ ...style.typography.bodyText, marginTop: '4px' }}>
          {c.description}
        </div>
      )}
      {c.highlights?.length > 0 && (
        <ul className="cv-bullet-list" style={{ paddingLeft: style.bullets.indent, listStyle: 'none', marginTop: '4px' }}>
          {c.highlights.map((h, i) => (
            <li key={i} style={{ ...style.typography.bodyText, marginBottom: style.spacing.bulletGap }}>
              <span style={{ color: style.colors.accent, marginRight: '6px' }}>{style.bullets.character}</span>
              {h}
            </li>
          ))}
        </ul>
      )}
      {c.keywords?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
          {c.keywords.map((kw, i) => (
            <span key={i} style={{
              ...style.typography.skillTag,
              background: `${style.colors.accent}15`,
              color: style.colors.accent,
              padding: '2px 6px',
              borderRadius: '3px',
            }}>
              {kw}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function CertificationSlotRenderer({ snippet, style }: SlotRendererProps) {
  const c = snippet.content as CertificationContent;
  return (
    <div className="cv-item cv-certification" style={{ marginBottom: style.spacing.itemGap }}>
      <div className="cv-job-title" style={style.typography.jobTitle}>{c.name}</div>
      <div className="cv-company-date" style={style.typography.companyDate}>
        {c.issuer} {c.date && `— ${c.date}`}
      </div>
      {c.description && <div style={{ ...style.typography.bodyText, marginTop: '2px' }}>{c.description}</div>}
    </div>
  );
}

export function PublicationSlotRenderer({ snippet, style }: SlotRendererProps) {
  const c = snippet.content as PublicationContent;
  return (
    <div className="cv-item cv-publication" style={{ marginBottom: style.spacing.itemGap }}>
      <div className="cv-job-title" style={style.typography.jobTitle}>{c.name}</div>
      <div className="cv-company-date" style={style.typography.companyDate}>
        {c.publisher} {c.releaseDate && `— ${c.releaseDate}`}
      </div>
      {c.summary && <div style={{ ...style.typography.bodyText, marginTop: '2px' }}>{c.summary}</div>}
    </div>
  );
}

export function LanguageSlotRenderer({ snippet, style }: SlotRendererProps) {
  const c = snippet.content as LanguageContent;
  return (
    <div className="cv-item cv-language" style={{ ...style.typography.bodyText, marginBottom: style.spacing.bulletGap }}>
      <strong>{c.language}</strong> — {c.fluency}
    </div>
  );
}

export function AwardSlotRenderer({ snippet, style }: SlotRendererProps) {
  const c = snippet.content as AwardContent;
  return (
    <div className="cv-item cv-award" style={{ marginBottom: style.spacing.itemGap }}>
      <div className="cv-job-title" style={style.typography.jobTitle}>{c.title}</div>
      <div className="cv-company-date" style={style.typography.companyDate}>
        {c.awarder} {c.date && `— ${c.date}`}
      </div>
    </div>
  );
}

export function VolunteerSlotRenderer({ snippet, style }: SlotRendererProps) {
  const c = snippet.content as VolunteerContent;
  const dateFormat = style.layout.dateFormat;
  return (
    <div className="cv-item cv-volunteer">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div className="cv-job-title" style={style.typography.jobTitle}>{c.position} — {c.organization}</div>
        <div style={{ whiteSpace: 'nowrap', ...style.typography.companyDate }}>
          {formatDate(c.startDate, dateFormat)} — {c.current ? 'Present' : formatDate(c.endDate, dateFormat)}
        </div>
      </div>
      {c.highlights?.length > 0 && (
        <ul className="cv-bullet-list" style={{ paddingLeft: style.bullets.indent, listStyle: 'none', marginTop: '4px' }}>
          {c.highlights.map((h, i) => (
            <li key={i} style={{ ...style.typography.bodyText, marginBottom: style.spacing.bulletGap }}>
              <span style={{ color: style.colors.accent, marginRight: '6px' }}>{style.bullets.character}</span>
              {h}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function InterestSlotRenderer({ snippet, style }: SlotRendererProps) {
  const c = snippet.content as InterestContent;
  return (
    <div className="cv-item cv-interest" style={{ ...style.typography.bodyText, marginBottom: style.spacing.bulletGap }}>
      <strong>{c.name}</strong>
      {c.keywords.length > 0 && `: ${c.keywords.join(', ')}`}
    </div>
  );
}

export function ReferenceSlotRenderer({ snippet, style }: SlotRendererProps) {
  const c = snippet.content as ReferenceContent;
  return (
    <div className="cv-item cv-reference" style={{ marginBottom: style.spacing.itemGap }}>
      <div className="cv-job-title" style={style.typography.jobTitle}>{c.name}</div>
      <div style={{ ...style.typography.bodyText, fontStyle: 'italic' }}>{c.reference}</div>
    </div>
  );
}

// ─── RENDERER MAP ────────────────────────────────────────

export const SLOT_RENDERER_MAP: Record<string, React.FC<SlotRendererProps>> = {
  header: HeaderSlotRenderer,
  summary: SummarySlotRenderer,
  experience: ExperienceSlotRenderer,
  education: EducationSlotRenderer,
  skills: SkillsSlotRenderer,
  projects: ProjectSlotRenderer,
  certifications: CertificationSlotRenderer,
  publications: PublicationSlotRenderer,
  languages: LanguageSlotRenderer,
  awards: AwardSlotRenderer,
  volunteer: VolunteerSlotRenderer,
  interests: InterestSlotRenderer,
  references: ReferenceSlotRenderer,
};

export function getSlotRenderer(slotType: string): React.FC<SlotRendererProps> | undefined {
  return SLOT_RENDERER_MAP[slotType];
}
