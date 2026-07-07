'use client';

import React from 'react';
import { Linkedin, ExternalLink, Mail, Search } from 'lucide-react';

interface JobApplication {
  id: string;
  _id: string;
  jobTitle: string;
  title?: string;
  company: string;
  location?: string;
  contactDetails?: {
    name?: string;
    email?: string;
    role?: string;
  };
  jobUrl?: string;
}

interface LinkedInJobTabProps {
  job: JobApplication;
}

const LinkedInJobTab: React.FC<LinkedInJobTabProps> = ({ job }) => {
  const company = job.company || '';
  const location = job.location || '';
  const searchQuery = encodeURIComponent(`${company} hiring manager${location ? ` ${location}` : ''}`);

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl border border-[color:var(--border-primary)] bg-[var(--bg-secondary)]">
        <h4 className="text-small font-bold text-[color:var(--text-primary)] mb-3">Find Hiring Managers</h4>
        <p className="text-small text-[color:var(--text-secondary)] mb-3">
          Search for recruiters and hiring managers at <strong>{company}</strong> on LinkedIn.
        </p>
        <a
          href={`https://www.linkedin.com/search/results/people/?keywords=${searchQuery}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#0A66C2] text-white text-small font-medium rounded-lg hover:bg-[#0A66C2]/90 transition-colors"
        >
          <Search size={14} />
          Search LinkedIn
          <ExternalLink size={12} />
        </a>
      </div>

      {job.jobUrl && (
        <div className="p-4 rounded-xl border border-[color:var(--border-primary)] bg-[var(--bg-secondary)]">
          <h4 className="text-small font-bold text-[color:var(--text-primary)] mb-3">View Job on LinkedIn</h4>
          <a
            href={job.jobUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--bg-primary)] text-[color:var(--text-primary)] text-small font-medium rounded-lg border border-[color:var(--border-primary)] hover:bg-[var(--hover-bg)] transition-colors"
          >
            <Linkedin size={14} />
            Open Job Posting
            <ExternalLink size={12} />
          </a>
        </div>
      )}

      {job.contactDetails?.email && (
        <div className="p-4 rounded-xl border border-[color:var(--border-primary)] bg-[var(--bg-secondary)]">
          <h4 className="text-small font-bold text-[color:var(--text-primary)] mb-3">Contact Recruiter</h4>
          <a
            href={`mailto:${job.contactDetails.email}?subject=Following up on ${job.jobTitle} at ${company}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--bg-primary)] text-[color:var(--text-primary)] text-small font-medium rounded-lg border border-[color:var(--border-primary)] hover:bg-[var(--hover-bg)] transition-colors"
          >
            <Mail size={14} />
            Email {job.contactDetails.name || 'Recruiter'}
          </a>
        </div>
      )}
    </div>
  );
};

export default LinkedInJobTab;
