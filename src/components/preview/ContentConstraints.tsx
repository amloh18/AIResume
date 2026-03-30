'use client';

import React, { useMemo } from 'react';

// ─── CHARACTER COUNTER ────────────────────────────────────

interface CharacterCounterProps {
  text: string;
  maxCharacters: number;
  label?: string;
  className?: string;
}

export const CharacterCounter: React.FC<CharacterCounterProps> = ({
  text,
  maxCharacters,
  label,
  className = '',
}) => {
  const count = text?.length || 0;
  const percentage = (count / maxCharacters) * 100;

  const colorClass =
    percentage >= 100
      ? 'text-red-600 bg-red-50'
      : percentage >= 80
        ? 'text-amber-600 bg-amber-50'
        : 'text-gray-500 bg-gray-50';

  const barColor =
    percentage >= 100
      ? 'bg-red-500'
      : percentage >= 80
        ? 'bg-amber-500'
        : 'bg-lime-500';

  return (
    <div className={`flex items-center gap-2 text-[10px] ${className}`}>
      {label && <span className="text-gray-400">{label}</span>}
      <div className="flex items-center gap-1.5">
        <div className="w-16 h-1 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${barColor}`}
            style={{ width: `${Math.min(100, percentage)}%` }}
          />
        </div>
        <span className={`px-1.5 py-0.5 rounded-full font-medium ${colorClass}`}>
          {count}/{maxCharacters}
        </span>
      </div>
    </div>
  );
};

// ─── LINE COUNTER ─────────────────────────────────────────

interface LineCounterProps {
  text: string;
  maxLines: number;
  label?: string;
  className?: string;
}

export const LineCounter: React.FC<LineCounterProps> = ({
  text,
  maxLines,
  label,
  className = '',
}) => {
  const lineCount = useMemo(() => {
    if (!text) return 0;
    return text.split('\n').filter(l => l.trim()).length;
  }, [text]);

  const percentage = (lineCount / maxLines) * 100;

  const colorClass =
    percentage >= 100
      ? 'text-red-600 bg-red-50'
      : percentage >= 80
        ? 'text-amber-600 bg-amber-50'
        : 'text-gray-500 bg-gray-50';

  const barColor =
    percentage >= 100
      ? 'bg-red-500'
      : percentage >= 80
        ? 'bg-amber-500'
        : 'bg-lime-500';

  return (
    <div className={`flex items-center gap-2 text-[10px] ${className}`}>
      {label && <span className="text-gray-400">{label}</span>}
      <div className="flex items-center gap-1.5">
        <div className="w-12 h-1 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${barColor}`}
            style={{ width: `${Math.min(100, percentage)}%` }}
          />
        </div>
        <span className={`px-1.5 py-0.5 rounded-full font-medium ${colorClass}`}>
          {lineCount}/{maxLines} lines
        </span>
      </div>
    </div>
  );
};

// ─── BULLET COUNTER ───────────────────────────────────────

interface BulletCounterProps {
  bullets: string[];
  maxBullets: number;
  label?: string;
  className?: string;
}

export const BulletCounter: React.FC<BulletCounterProps> = ({
  bullets,
  maxBullets,
  label,
  className = '',
}) => {
  const count = bullets?.length || 0;
  const percentage = (count / maxBullets) * 100;

  const colorClass =
    percentage >= 100
      ? 'text-red-600 bg-red-50'
      : percentage >= 80
        ? 'text-amber-600 bg-amber-50'
        : 'text-gray-500 bg-gray-50';

  return (
    <div className={`flex items-center gap-2 text-[10px] ${className}`}>
      {label && <span className="text-gray-400">{label}</span>}
      <span className={`px-1.5 py-0.5 rounded-full font-medium ${colorClass}`}>
        {count}/{maxBullets} bullets
      </span>
    </div>
  );
};
