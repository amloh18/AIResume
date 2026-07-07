'use client';

import React from 'react';

interface InterviewPrepWidgetProps {
  status?: string;
  interviews?: Array<{
    date?: Date;
    interviewer?: string;
    meetingLink?: string;
  }>;
}

const InterviewPrepWidget: React.FC<InterviewPrepWidgetProps> = ({ interviews }) => {
  const nextInterview = interviews?.[0];

  return (
    <div className="p-4 rounded-xl border border-[color:var(--border-primary)] bg-[var(--bg-secondary)]">
      <h4 className="text-small font-bold text-[color:var(--text-primary)] mb-2">Interview Prep</h4>
      {nextInterview ? (
        <div className="text-small text-[color:var(--text-secondary)]">
          <p>Next: {nextInterview.date ? new Date(nextInterview.date).toLocaleString() : 'TBD'}</p>
          {nextInterview.interviewer && <p>Interviewer: {nextInterview.interviewer}</p>}
        </div>
      ) : (
        <p className="text-small text-[color:var(--text-secondary)]">No interviews scheduled.</p>
      )}
    </div>
  );
};

export default InterviewPrepWidget;
