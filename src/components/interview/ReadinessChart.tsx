
import React from 'react';
import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import { useTheme } from '@/lib/contexts/ThemeContext';

const ReadinessChart = ({ score }: { score: number }) => {
    const { theme } = useTheme();

    // Safety check for NaN or undefined
    const safeScore = isNaN(score) ? 0 : Math.max(0, Math.min(100, score));

    const data = [
        { name: 'Score', value: safeScore, fill: safeScore >= 80 ? '#22c55e' : safeScore >= 50 ? '#eab308' : '#84cc16' }
    ];

    return (
        <div className="relative w-48 h-48">
            <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                    cx="50%"
                    cy="50%"
                    innerRadius="80%"
                    outerRadius="100%"
                    barSize={10}
                    data={data}
                    startAngle={90}
                    endAngle={-270}
                >
                    <PolarAngleAxis
                        type="number"
                        domain={[0, 100]}
                        angleAxisId={0}
                        tick={false}
                    />
                    <RadialBar
                        background={{ fill: theme === 'dark' ? '#27272a' : '#f3f4f6' }}
                        dataKey="value"
                        cornerRadius={10}
                    />
                </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-gray-900 dark:text-white">{safeScore}%</span>
                <span className="text-xs text-gray-500 uppercase font-medium">Ready</span>
            </div>
        </div>
    );
};

export default ReadinessChart;
