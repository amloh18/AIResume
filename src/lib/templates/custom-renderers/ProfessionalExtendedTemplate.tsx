'use client';

import React from 'react';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { stripHtmlTags, formatDateRangeWithStyle, formatDateWithStyle, type DateFormatStyle } from '@/lib/utils/textFormatting';

interface ProfessionalExtendedTemplateProps {
  cvData: UnifiedCVDataStructure;
  className?: string;
  dateFormat?: DateFormatStyle;
}

/** Sort array by endDate descending (most recent first). Items without dates go last. */
function sortByRecent<T extends { startDate?: string; endDate?: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const aDate = a.endDate?.toLowerCase() === 'present' ? '9999' : (a.endDate || a.startDate || '');
    const bDate = b.endDate?.toLowerCase() === 'present' ? '9999' : (b.endDate || b.startDate || '');
    return bDate.localeCompare(aDate);
  });
}

export const ProfessionalExtendedTemplate: React.FC<ProfessionalExtendedTemplateProps> = ({
  cvData,
  className = '',
  dateFormat = 'MMM_YYYY'
}) => {
  const basics = cvData?.basics || {};
  const work = sortByRecent(cvData?.work || []);
  const education = sortByRecent(cvData?.education || []);
  const skills = cvData?.skills || [];
  const projects = sortByRecent(cvData?.projects || []);
  const certs = cvData?.certificates || [];
  const langs = cvData?.languages || [];

  const locationParts = [
    basics.location?.city,
    basics.location?.region,
    basics.location?.countryCode
  ].filter(Boolean);

  const hasContact = basics.email || basics.phone || basics.url || locationParts.length > 0;
  const hasLeftColumn = hasContact || education.length > 0 || skills.length > 0;
  const hasRightColumn = work.length > 0 || projects.length > 0 || certs.length > 0 || langs.length > 0;

  return (
    <div className={`professional-extended-template ${className}`}>
      <style dangerouslySetInnerHTML={{__html: `
        .professional-extended-template {
          font-family: 'Arial', 'Helvetica', sans-serif;
          font-size: 11px;
          line-height: 1.45;
          color: #1a1a1a;
          background: #ffffff;
          max-width: 100%;
          margin: 0;
          padding: 32px;
          box-sizing: border-box;
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .professional-extended-template h1,
        .professional-extended-template h2,
        .professional-extended-template h3,
        .professional-extended-template h4,
        .professional-extended-template p,
        .professional-extended-template span,
        .professional-extended-template div {
          color: inherit;
        }

        /* ── Header ── */
        .professional-extended-template .header {
          text-align: center;
          margin-bottom: 8px;
        }

        .professional-extended-template .name {
          font-size: 26px;
          font-weight: 700;
          color: #111827;
          margin: 0 0 4px 0;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          line-height: 1.2;
        }

        .professional-extended-template .title {
          font-size: 13px;
          font-weight: 400;
          color: #4b5563;
          margin: 0 0 10px 0;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .professional-extended-template .header-line {
          height: 1.5px;
          background: #111827;
          margin: 0 auto;
          width: 100%;
        }

        /* ── Contact Bar (inline) ── */
        .professional-extended-template .contact-bar {
          display: flex;
          justify-content: center;
          align-items: center;
          flex-wrap: wrap;
          gap: 6px;
          padding: 10px 0 0 0;
          font-size: 10.5px;
          color: #4b5563;
        }

        .professional-extended-template .contact-bar-item {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          white-space: nowrap;
        }

        .professional-extended-template .contact-bar-sep {
          color: #9ca3af;
          user-select: none;
        }

        .professional-extended-template .contact-bar-icon {
          width: 11px;
          height: 11px;
          flex-shrink: 0;
          opacity: 0.7;
        }

        /* ── Profile ── */
        .professional-extended-template .profile-section {
          margin: 16px 0 0 0;
        }

        .professional-extended-template .section-title {
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          color: #111827;
          margin: 0 0 6px 0;
          padding-bottom: 4px;
          border-bottom: 1px solid #d1d5db;
        }

        .professional-extended-template .profile-text {
          font-size: 11px;
          line-height: 1.55;
          color: #374151;
          text-align: justify;
        }

        /* ── Two-column grid ── */
        .professional-extended-template .main-content {
          display: grid;
          grid-template-columns: 1fr 1.5fr;
          gap: 24px;
          margin-top: 16px;
        }

        .professional-extended-template .left-column {
          padding-right: 12px;
        }

        .professional-extended-template .right-column {
          padding-left: 12px;
          position: relative;
        }

        .professional-extended-template .timeline-line {
          position: absolute;
          left: 0;
          top: 4px;
          bottom: 4px;
          width: 1.5px;
          background: #d1d5db;
        }

        /* ── Sections ── */
        .professional-extended-template .section {
          margin-bottom: 16px;
          page-break-inside: avoid;
          break-inside: avoid;
        }

        /* ── Contact list (left column) ── */
        .professional-extended-template .contact-list {
          font-size: 10.5px;
          line-height: 1.5;
        }

        .professional-extended-template .contact-list-item {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 4px;
          color: #374151;
        }

        .professional-extended-template .contact-list-icon {
          width: 11px;
          height: 11px;
          flex-shrink: 0;
          opacity: 0.65;
        }

        .professional-extended-template .contact-list-label {
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* ── Education ── */
        .professional-extended-template .education-item {
          margin-bottom: 10px;
          page-break-inside: avoid;
          break-inside: avoid;
        }

        .professional-extended-template .degree {
          font-size: 11px;
          font-weight: 700;
          color: #111827;
          margin-bottom: 1px;
        }

        .professional-extended-template .university {
          font-size: 10.5px;
          color: #4b5563;
          margin-bottom: 1px;
        }

        .professional-extended-template .edu-dates {
          font-size: 10px;
          color: #6b7280;
        }

        .professional-extended-template .edu-description {
          font-size: 10px;
          color: #4b5563;
          margin-top: 2px;
          line-height: 1.4;
        }

        .professional-extended-template .edu-score {
          font-size: 10px;
          color: #6b7280;
          font-style: italic;
        }

        .professional-extended-template .edu-courses {
          font-size: 10px;
          color: #6b7280;
          margin-top: 2px;
        }

        /* ── Skills (inline category: skills) ── */
        .professional-extended-template .skills-inline-list {
          font-size: 10.5px;
          line-height: 1.6;
        }

        .professional-extended-template .skills-inline-row {
          margin-bottom: 3px;
          display: block;
        }

        .professional-extended-template .skills-cat {
          font-weight: 700;
          color: #111827;
        }

        .professional-extended-template .skills-items {
          color: #4b5563;
        }

        /* ── Languages ── */
        .professional-extended-template .lang-item {
          font-size: 10.5px;
          color: #374151;
          margin-bottom: 2px;
        }

        .professional-extended-template .lang-name {
          font-weight: 600;
        }

        .professional-extended-template .lang-fluency {
          color: #6b7280;
          font-size: 10px;
        }

        /* ── Experience (right column) ── */
        .professional-extended-template .experience-item {
          margin-bottom: 14px;
          position: relative;
          padding-left: 16px;
          page-break-inside: avoid;
          break-inside: avoid;
        }

        .professional-extended-template .timeline-dot {
          position: absolute;
          left: -4px;
          top: 5px;
          width: 7px;
          height: 7px;
          background: #111827;
          border-radius: 50%;
          border: 1.5px solid #ffffff;
          box-shadow: 0 0 0 1.5px #d1d5db;
        }

        .professional-extended-template .experience-header {
          margin-bottom: 4px;
        }

        .professional-extended-template .job-title {
          font-size: 12px;
          font-weight: 700;
          color: #111827;
          margin: 0 0 1px 0;
        }

        .professional-extended-template .company-line {
          font-size: 10.5px;
          color: #4b5563;
          margin: 0;
          display: flex;
          align-items: baseline;
          flex-wrap: wrap;
          gap: 0 4px;
        }

        .professional-extended-template .company-name {
          font-weight: 600;
          font-style: italic;
        }

        .professional-extended-template .job-dates {
          color: #6b7280;
          white-space: nowrap;
        }

        .professional-extended-template .job-description {
          font-size: 10.5px;
          line-height: 1.5;
          color: #374151;
          margin: 4px 0 0 0;
        }

        .professional-extended-template .job-description ul {
          margin: 3px 0;
          padding-left: 16px;
          list-style-type: disc;
        }

        .professional-extended-template .job-description li {
          margin-bottom: 2px;
        }

        .professional-extended-template .job-description p {
          margin: 0 0 4px 0;
          text-align: justify;
        }

        /* ── Projects ── */
        .professional-extended-template .project-item {
          margin-bottom: 12px;
          padding-left: 16px;
          position: relative;
          page-break-inside: avoid;
          break-inside: avoid;
        }

        .professional-extended-template .project-title {
          font-size: 11px;
          font-weight: 700;
          color: #111827;
          margin-bottom: 1px;
        }

        .professional-extended-template .project-desc {
          font-size: 10.5px;
          color: #4b5563;
          line-height: 1.5;
        }

        .professional-extended-template .project-dates {
          font-size: 10px;
          color: #6b7280;
        }

        /* ── Certificates ── */
        .professional-extended-template .cert-item {
          margin-bottom: 8px;
          page-break-inside: avoid;
          break-inside: avoid;
        }

        .professional-extended-template .cert-name {
          font-size: 11px;
          font-weight: 700;
          color: #111827;
        }

        .professional-extended-template .cert-issuer {
          font-size: 10px;
          color: #4b5563;
        }

        .professional-extended-template .cert-date {
          font-size: 10px;
          color: #6b7280;
        }

        /* ── Footer ── */
        .professional-extended-template .footer {
          margin-top: 20px;
          padding-top: 10px;
          border-top: 1px solid #d1d5db;
          display: flex;
          justify-content: center;
          align-items: center;
          font-size: 10px;
          color: #6b7280;
          flex-wrap: wrap;
          gap: 6px;
        }

        .professional-extended-template .footer-item {
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .professional-extended-template .footer-sep {
          color: #9ca3af;
        }

        /* ── Page break helpers ── */
        .professional-extended-template .section-title {
          page-break-after: avoid;
          break-after: avoid;
        }

        @media print {
          .professional-extended-template {
            padding: 0;
            margin: 0;
            max-width: none;
          }
        }
      `}} />

      {/* ═══ Header ═══ */}
      <div className="header" data-section-id="personal">
        <div className="name">{basics.name || 'Your Name'}</div>
        {basics.label && <div className="title">{basics.label}</div>}
        <div className="header-line" />

        {/* Inline contact bar */}
        {hasContact && (
          <div className="contact-bar">
            {basics.email && (
              <>
                <span className="contact-bar-item">
                  <svg className="contact-bar-icon" fill="currentColor" viewBox="0 0 20 20"><path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" /><path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" /></svg>
                  {basics.email}
                </span>
                {(basics.phone || basics.url || locationParts.length > 0) && <span className="contact-bar-sep">|</span>}
              </>
            )}
            {basics.phone && (
              <>
                <span className="contact-bar-item">
                  <svg className="contact-bar-icon" fill="currentColor" viewBox="0 0 20 20"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" /></svg>
                  {basics.phone}
                </span>
                {(basics.url || locationParts.length > 0) && <span className="contact-bar-sep">|</span>}
              </>
            )}
            {locationParts.length > 0 && (
              <>
                <span className="contact-bar-item">
                  <svg className="contact-bar-icon" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
                  {locationParts.join(', ')}
                </span>
                {basics.url && <span className="contact-bar-sep">|</span>}
              </>
            )}
            {basics.url && (
              <span className="contact-bar-item">
                <svg className="contact-bar-icon" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" /></svg>
                {basics.url}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ═══ Profile ═══ */}
      {basics.summary && (
        <div className="profile-section" data-section-id="summary">
          <div className="section-title">Profile</div>
          <div className="profile-text">{stripHtmlTags(basics.summary)}</div>
        </div>
      )}

      {/* ═══ Main Content ═══ */}
      {(hasLeftColumn || hasRightColumn) && (
        <div className="main-content">
          {/* ── Left Column ── */}
          <div className="left-column">
            {/* Contact (detailed) */}
            {hasContact && (
              <div className="section" data-section-id="personal">
                <div className="section-title">Contact</div>
                <div className="contact-list">
                  {basics.phone && (
                    <div className="contact-list-item">
                      <svg className="contact-list-icon" fill="currentColor" viewBox="0 0 20 20"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" /></svg>
                      <span className="contact-list-label">{basics.phone}</span>
                    </div>
                  )}
                  {basics.email && (
                    <div className="contact-list-item">
                      <svg className="contact-list-icon" fill="currentColor" viewBox="0 0 20 20"><path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" /><path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" /></svg>
                      <span className="contact-list-label">{basics.email}</span>
                    </div>
                  )}
                  {basics.url && (
                    <div className="contact-list-item">
                      <svg className="contact-list-icon" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" /></svg>
                      <span className="contact-list-label">{basics.url}</span>
                    </div>
                  )}
                  {basics.profiles?.map((profile: any, i: number) => (
                    <div key={i} className="contact-list-item">
                      <svg className="contact-list-icon" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.338 16.338H13.67V12.16c0-.995-.017-2.277-1.387-2.277-1.39 0-1.601 1.086-1.601 2.207v4.248H8.014v-8.59h2.559v1.174h.037c.356-.675 1.227-1.387 2.526-1.387 2.703 0 3.203 1.778 3.203 4.092v4.711zM5.005 6.575a1.548 1.548 0 11-.003-3.096 1.548 1.548 0 01.003 3.096zm-1.337 9.763H6.34v-8.59H3.667v8.59zM17.668 1H2.328C1.595 1 1 1.581 1 2.298v15.403C1 18.418 1.595 19 2.328 19h15.34c.734 0 1.332-.582 1.332-1.299V2.298C19 1.581 18.402 1 17.668 1z" clipRule="evenodd" /></svg>
                      <span className="contact-list-label">{profile.url || profile.username}</span>
                    </div>
                  ))}
                  {locationParts.length > 0 && (
                    <div className="contact-list-item">
                      <svg className="contact-list-icon" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
                      <span className="contact-list-label">{locationParts.join(', ')}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Education */}
            {education.length > 0 && (
              <div className="section" data-section-id="education">
                <div className="section-title">Education</div>
                {education.map((edu: any, i: number) => (
                  <div key={i} className="education-item" data-item-id={i}>
                    <div className="degree">
                      {[edu.studyType, edu.area].filter(Boolean).join(' in ') || 'Degree'}
                    </div>
                    {edu.institution && <div className="university">{edu.institution}</div>}
                    {(edu.startDate || edu.endDate) && (
                      <div className="edu-dates">{formatDateRangeWithStyle(edu.startDate, edu.endDate, dateFormat)}</div>
                    )}
                    {edu.score && <div className="edu-score">{edu.score}</div>}
                    {edu.description && <div className="edu-description">{stripHtmlTags(edu.description)}</div>}
                    {edu.courses && Array.isArray(edu.courses) && edu.courses.length > 0 && (
                      <div className="edu-courses">Courses: {edu.courses.join(', ')}</div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Skills — inline: Category — skill1, skill2 */}
            {skills.length > 0 && (
              <div className="section" data-section-id="skills">
                <div className="section-title">Skills</div>
                <div className="skills-inline-list">
                  {skills.map((sg: any, i: number) => {
                    const skillList = Array.isArray(sg.skills) ? sg.skills : [];
                    if (!sg.category && skillList.length === 0) return null;
                    return (
                      <div key={i} className="skills-inline-row">
                        {sg.category && <span className="skills-cat">{sg.category}: </span>}
                        <span className="skills-items">{skillList.join(', ')}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Languages */}
            {langs.length > 0 && (
              <div className="section" data-section-id="languages">
                <div className="section-title">Languages</div>
                {langs.map((l: any, i: number) => (
                  <div key={i} className="lang-item">
                    <span className="lang-name">{l.language}</span>
                    {l.fluency && <span className="lang-fluency"> — {l.fluency}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Right Column ── */}
          <div className="right-column">
            <div className="timeline-line" />

            {/* Experience */}
            {work.length > 0 && (
              <div className="section" data-section-id="work">
                <div className="section-title">Experience</div>
                {work.map((job: any, i: number) => (
                  <div key={i} className="experience-item" data-item-id={i}>
                    <div className="timeline-dot" />
                    <div className="experience-header">
                      <div className="job-title">{job.position || 'Position'}</div>
                      <div className="company-line">
                        {job.name && <span className="company-name">{job.name}</span>}
                        {(job.startDate || job.endDate) && (
                          <span className="job-dates">
                            {job.name ? ' | ' : ''}{formatDateRangeWithStyle(job.startDate, job.endDate, dateFormat)}
                          </span>
                        )}
                      </div>
                    </div>
                    {job.summary && (
                      <div className="job-description">
                        {stripHtmlTags(job.summary).split('\n').filter(Boolean).map((line: string, li: number) => (
                          <p key={li}>{line}</p>
                        ))}
                      </div>
                    )}
                    {job.highlights && Array.isArray(job.highlights) && job.highlights.length > 0 && (
                      <div className="job-description">
                        <ul>
                          {job.highlights.map((h: string, hi: number) => (
                            <li key={hi}>{stripHtmlTags(h)}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Projects */}
            {projects.length > 0 && (
              <div className="section" data-section-id="projects">
                <div className="section-title">Projects</div>
                {projects.map((p: any, i: number) => (
                  <div key={i} className="project-item" data-item-id={i}>
                    <div className="timeline-dot" />
                    <div className="project-title">{p.name || 'Project'}</div>
                    {(p.startDate || p.endDate) && (
                      <div className="project-dates">{formatDateRangeWithStyle(p.startDate, p.endDate, dateFormat)}</div>
                    )}
                    {p.description && (
                      <div className="project-desc">{stripHtmlTags(p.description)}</div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Certificates */}
            {certs.length > 0 && (
              <div className="section" data-section-id="certificates">
                <div className="section-title">Certifications</div>
                {certs.map((c: any, i: number) => (
                  <div key={i} className="cert-item" data-item-id={i}>
                    <div className="cert-name">{c.name || 'Certificate'}</div>
                    {c.issuer && <div className="cert-issuer">{c.issuer}</div>}
                    {c.date && <div className="cert-date">{formatDateWithStyle(c.date, dateFormat)}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ Footer ═══ */}
      {(basics.email || basics.profiles?.length > 0) && (
        <div className="footer">
          {basics.email && <span className="footer-item">{basics.email}</span>}
          {basics.profiles?.map((profile: any, i: number) => (
            <React.Fragment key={i}>
              {(basics.email || i > 0) && <span className="footer-sep">·</span>}
              <span className="footer-item">{profile.network || profile.username || profile.url}</span>
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
};
