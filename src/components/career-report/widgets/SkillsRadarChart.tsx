'use client';

import React from 'react';
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';

interface SkillsRadarChartProps {
  skillsGap?: {
    focusDistribution?: Array<{
      area: string;
      percentage: number;
    }>;
    skills?: Array<{
      name: string;
      mentions: number;
      quantifiedUse: number;
    }>;
  };
  impactScore?: {
    quantifiableStatements?: number;
    highImpactVerbs?: number;
  };
}

const SkillsRadarChart: React.FC<SkillsRadarChartProps> = ({
  skillsGap,
  impactScore
}) => {
  // Transform data for radar chart
  const radarData = React.useMemo(() => {
    const data: any = {};

    // Map focus distribution
    if (skillsGap?.focusDistribution) {
      skillsGap.focusDistribution.forEach((item) => {
        // Normalize area names
        const key = item.area.toLowerCase().replace(/\s+/g, '_');
        data[key] = item.percentage;
      });
    }

    // Add impact metrics
    if (impactScore) {
      data.quantification = Math.min(
        ((impactScore.quantifiableStatements || 0) / 15) * 100,
        100
      );
      data.action_verbs = Math.min(
        ((impactScore.highImpactVerbs || 0) / 30) * 100,
        100
      );
    }

    // Calculate skill depth average
    if (skillsGap?.skills) {
      const avgQuantified = skillsGap.skills.reduce((sum, skill) => 
        sum + (skill.quantifiedUse / Math.max(skill.mentions, 1)), 0
      ) / skillsGap.skills.length;
      data.skill_depth = Math.min(avgQuantified * 100, 100);
    }

    // Default values if not present
    const defaultData = {
      technical_implementation: data.technical_implementation || 60,
      team_collaboration: data.team_collaboration || 40,
      strategic_planning: data.strategic_planning || 30,
      quantification: data.quantification || 50,
      action_verbs: data.action_verbs || 50,
      skill_depth: data.skill_depth || 50
    };

    return [
      {
        category: 'Technical',
        value: defaultData.technical_implementation,
        fullMark: 100
      },
      {
        category: 'Collaboration',
        value: defaultData.team_collaboration,
        fullMark: 100
      },
      {
        category: 'Strategy',
        value: defaultData.strategic_planning,
        fullMark: 100
      },
      {
        category: 'Quantification',
        value: defaultData.quantification,
        fullMark: 100
      },
      {
        category: 'Action Verbs',
        value: defaultData.action_verbs,
        fullMark: 100
      },
      {
        category: 'Skill Depth',
        value: defaultData.skill_depth,
        fullMark: 100
      }
    ];
  }, [skillsGap, impactScore]);

  return (
    <div className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-xl p-8 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 bg-[#80FF00] rounded flex items-center justify-center">
          <Zap className="w-5 h-5 text-black" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Skills Radar Chart</h3>
      </div>

      <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm leading-relaxed">
        Visual mapping of your CV's skill distribution and strengths
      </p>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
            <PolarGrid stroke="#e5e7eb" className="dark:stroke-gray-700" />
            <PolarAngleAxis
              dataKey="category"
              tick={{ fill: 'currentColor', fontSize: 11 }}
              className="dark:text-gray-300"
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={{ fill: 'currentColor', fontSize: 10 }}
              className="dark:text-gray-400"
            />
            <Radar
              name="Your CV"
              dataKey="value"
              stroke="#80FF00"
              fill="#80FF00"
              fillOpacity={0.6}
              strokeWidth={2}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default SkillsRadarChart;

