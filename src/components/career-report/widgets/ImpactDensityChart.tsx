'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { motion } from 'framer-motion';
import { BarChart3 } from 'lucide-react';

interface ImpactDensityChartProps {
  impactScore?: {
    quantifiableStatements?: number;
  };
  skillsGap?: {
    skills?: Array<{
      name: string;
      mentions: number;
      quantifiedUse: number;
    }>;
  };
}

const ImpactDensityChart: React.FC<ImpactDensityChartProps> = ({
  impactScore,
  skillsGap
}) => {
  // Generate chart data based on skills and impact
  const chartData = React.useMemo(() => {
    const data: Array<{ name: string; quantified: number; total: number }> = [];

    // Add skills data
    if (skillsGap?.skills) {
      skillsGap.skills.slice(0, 6).forEach((skill) => {
        data.push({
          name: skill.name.length > 12 ? skill.name.substring(0, 12) + '...' : skill.name,
          quantified: skill.quantifiedUse,
          total: skill.mentions
        });
      });
    }

    // If no skills data, create sample data structure
    if (data.length === 0) {
      const sampleSkills = ['Leadership', 'Project Management', 'Technical Skills', 'Communication', 'Problem Solving'];
      sampleSkills.forEach((skill) => {
        const total = Math.floor(Math.random() * 8) + 2;
        const quantified = Math.floor(total * (impactScore?.quantifiableStatements || 3) / 15);
        data.push({
          name: skill,
          quantified,
          total
        });
      });
    }

    return data;
  }, [skillsGap, impactScore]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-2">
          <p className="font-semibold text-gray-900 dark:text-white text-xs mb-1">{data.name}</p>
          <p className="text-xs text-gray-600 dark:text-gray-300">
            Quantified: {data.quantified}/{data.total}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Gap: {data.total - data.quantified} statements need metrics
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-xl p-8 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 bg-[#80FF00] rounded flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-black" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Impact Density Chart</h3>
      </div>

      <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm leading-relaxed">
        Quantifiable statements per area - shows where metrics are needed
      </p>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -20, bottom: 10 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#e5e7eb"
              className="dark:stroke-gray-700"
              opacity={0.3}
            />
            <XAxis
              dataKey="name"
              tick={{ fill: 'currentColor', fontSize: 11 }}
              angle={-45}
              textAnchor="end"
              height={60}
              className="dark:text-gray-300"
            />
            <YAxis
              tick={{ fill: 'currentColor', fontSize: 11 }}
              className="dark:text-gray-300"
            />
            <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="total" fill="#e5e7eb" radius={[4, 4, 0, 0]} />
              <Bar dataKey="quantified" fill="#80FF00" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-center gap-4 mt-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-gray-300 dark:bg-gray-600 rounded"></div>
          <span className="text-gray-600 dark:text-gray-400">Total Mentions</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-[#80FF00] rounded"></div>
          <span className="text-gray-600 dark:text-gray-400">With Metrics</span>
        </div>
      </div>
    </div>
  );
};

export default ImpactDensityChart;

