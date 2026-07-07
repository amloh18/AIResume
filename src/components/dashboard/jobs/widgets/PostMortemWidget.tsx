'use client';

import React from 'react';

interface PostMortemWidgetProps {
  status?: string;
  reasonTags?: string[];
  startDate?: Date;
}

const PostMortemWidget: React.FC<PostMortemWidgetProps> = ({ status, reasonTags, startDate }) => {
  return (
    <div className="p-4 rounded-xl border border-[color:var(--border-primary)] bg-[var(--bg-secondary)]">
      <h4 className="text-small font-bold text-[color:var(--text-primary)] mb-2">Post-Mortem</h4>
      {status === 'accepted' && startDate && (
        <p className="text-small text-[color:var(--text-secondary)]">
          Start date: {new Date(startDate).toLocaleDateString()}
        </p>
      )}
      {reasonTags && reasonTags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {reasonTags.map((tag) => (
            <span key={tag} className="px-2 py-0.5 bg-[var(--bg-tertiary)] text-[color:var(--text-secondary)] rounded text-small">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default PostMortemWidget;
