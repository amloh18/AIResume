import React from 'react';

const ReadinessChart = ({ score }: { score: number }) => {
    const safeScore = isNaN(score) ? 0 : Math.max(0, Math.min(100, score));
    
    // SVG properties
    const size = 180;
    const strokeWidth = 14;
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
                    className="text-gray-100 dark:text-gray-800"
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
                    className="text-purple-600 dark:text-purple-500 transition-all duration-1000 ease-out"
                />
            </svg>
            
            {/* Center Content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-black text-gray-900 dark:text-white leading-none tracking-tight mt-2">
                    {safeScore}%
                </span>
                <span className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-widest">
                    Ready
                </span>
            </div>
        </div>
    );
};

export default ReadinessChart;
