import React from 'react';

interface ReadinessChartProps {
  score: number;
}

export default function ReadinessChart({ score }: ReadinessChartProps) {
  const safeScore = isNaN(score) ? 0 : Math.max(0, Math.min(100, score));

  // SVG properties
  const size = 170;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (safeScore / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
        {/* Background Circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-gray-100 dark:text-white/5"
        />
        {/* Foreground Progress Circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="text-emerald-600 dark:text-lime-500 transition-all duration-1000 ease-out"
        />
      </svg>

      {/* Center Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-black text-[var(--text-primary)] leading-none tracking-tight tabular-nums mt-1">
          {safeScore}%
        </span>
        <span className="text-[10px] font-bold text-[var(--text-tertiary)] mt-1 uppercase tracking-widest">
          Readiness
        </span>
      </div>
    </div>
  );
}
