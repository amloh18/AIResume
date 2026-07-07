'use client';

import React from 'react';

interface CompBreakdownWidgetProps {
  status?: string;
  salary?: {
    min?: number;
    max?: number;
    currency?: string;
    period?: 'hourly' | 'monthly' | 'yearly';
  };
  offerDetails?: {
    salary?: number;
    bonus?: string;
    equity?: string;
    deadline?: Date;
  };
}

const CompBreakdownWidget: React.FC<CompBreakdownWidgetProps> = ({ offerDetails }) => {
  return (
    <div className="p-4 rounded-xl border border-[color:var(--border-primary)] bg-[var(--bg-secondary)]">
      <h4 className="text-small font-bold text-[color:var(--text-primary)] mb-2">Comp Breakdown</h4>
      <div className="text-small text-[color:var(--text-secondary)] space-y-1">
        {offerDetails?.salary && <p>Base: ${offerDetails.salary.toLocaleString()}</p>}
        {offerDetails?.bonus && <p>Bonus: {offerDetails.bonus}</p>}
        {offerDetails?.equity && <p>Equity: {offerDetails.equity}</p>}
        {offerDetails?.deadline && (
          <p className="font-medium">Deadline: {new Date(offerDetails.deadline).toLocaleDateString()}</p>
        )}
      </div>
    </div>
  );
};

export default CompBreakdownWidget;
