'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { TrendingUp, Target, CheckCircle, RefreshCw } from 'lucide-react';

// Helper function to convert paragraphs to bullet points
const convertToBulletPoints = (text: string): React.ReactNode => {
  if (!text) return null;
  
  // Split by common sentence endings and newlines
  const sentences = text
    .split(/(?<=[.!?])\s+|(?<=\n)/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
  
  // If text is already short or has few sentences, return as is
  if (sentences.length <= 1) {
    return <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{text}</p>;
  }
  
  // Convert to bullet points
  return (
    <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400 text-sm">
      {sentences.map((sentence, index) => (
        <li key={index} className="leading-relaxed">{sentence}</li>
      ))}
    </ul>
  );
};

interface CareerPathStep {
  title: string;
  reasoning: string;
}

interface CareerCoherence {
  score?: number;
  strengths?: string[];
  redFlags?: Array<{
    issue: string;
    impact: string;
    action?: string;
  }>;
}

interface CareerTrajectoryGraphProps {
  careerPath: {
    step1: CareerPathStep;
    step2: CareerPathStep;
    step3: CareerPathStep;
  };
  careerCoherence?: CareerCoherence;
  experienceLevel?: string;
}

const CareerTrajectoryGraph: React.FC<CareerTrajectoryGraphProps> = ({
  careerPath,
  careerCoherence,
  experienceLevel
}) => {
  const coherenceScore = careerCoherence?.score ?? 85;
  
  // Generate trajectory data points based on career path steps
  const trajectoryData = [
    {
      stage: 'Current',
      level: 1,
      milestone: experienceLevel || 'Current Role',
      progress: 0,
      shortMilestone: (experienceLevel || 'Current Role').length > 15 
        ? (experienceLevel || 'Current Role').substring(0, 15) + '...' 
        : (experienceLevel || 'Current Role')
    },
    {
      stage: 'Step 1',
      level: 2,
      milestone: careerPath.step1.title,
      progress: 33,
      reasoning: careerPath.step1.reasoning,
      shortMilestone: careerPath.step1.title.length > 15 
        ? careerPath.step1.title.substring(0, 15) + '...' 
        : careerPath.step1.title
    },
    {
      stage: 'Step 2',
      level: 3,
      milestone: careerPath.step2.title,
      progress: 66,
      reasoning: careerPath.step2.reasoning,
      shortMilestone: careerPath.step2.title.length > 15 
        ? careerPath.step2.title.substring(0, 15) + '...' 
        : careerPath.step2.title
    },
    {
      stage: 'Step 3',
      level: 4,
      milestone: careerPath.step3.title,
      progress: 100,
      reasoning: careerPath.step3.reasoning,
      shortMilestone: careerPath.step3.title.length > 15 
        ? careerPath.step3.title.substring(0, 15) + '...' 
        : careerPath.step3.title
    }
  ];

  // Custom tooltip component
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4">
          <p className="font-semibold text-gray-900 dark:text-white mb-2">{data.milestone}</p>
          <p className="text-sm text-gray-600 dark:text-gray-300">{data.stage}</p>
          {data.reasoning && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 italic">{data.reasoning}</p>
          )}
        </div>
      );
    }
    return null;
  };

  // Custom label component for milestones
  const CustomLabel = ({ x, y, value, payload }: any) => {
    return (
      <g>
        <circle
          cx={x}
          cy={y}
          r={8}
          fill="#80FF00"
          stroke="#ffffff"
          strokeWidth={3}
          className="drop-shadow-lg"
        />
        <circle
          cx={x}
          cy={y}
          r={4}
          fill="#ffffff"
        />
        <text
          x={x}
          y={y - 20}
          textAnchor="middle"
          className="text-xs font-semibold fill-gray-900 dark:fill-gray-100"
          style={{ fontWeight: 600 }}
        >
          {payload.shortMilestone || payload.milestone}
        </text>
      </g>
    );
  };

  return (
    <div className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-xl p-8 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 bg-[#80FF00] rounded flex items-center justify-center">
          <RefreshCw className="w-5 h-5 text-black" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Career Trajectory Analysis</h3>
      </div>
      
      <div className="space-y-4">
      {/* Coherence Score with Radial Progress */}
      <div className="bg-gray-50 dark:bg-[#313a28] border border-gray-200 dark:border-white/10 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-1">
              Career Coherence Score
            </h4>
            <p className="text-xs text-gray-600 dark:text-white/60">
              {coherenceScore >= 80
                ? "Strong alignment with consistent progression."
                : coherenceScore >= 60
                ? "Moderate alignment with some areas for improvement."
                : "Could benefit from more focused progression."}
            </p>
          </div>
          <div className="relative w-24 h-24">
            <svg className="w-24 h-24 transform -rotate-90">
              <circle
                cx="48"
                cy="48"
                r="40"
                stroke="currentColor"
                strokeWidth="6"
                fill="none"
                className="text-gray-200 dark:text-gray-700"
              />
              <motion.circle
                cx="48"
                cy="48"
                r="40"
                stroke="currentColor"
                strokeWidth="6"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 40}`}
                strokeDashoffset={`${2 * Math.PI * 40 * (1 - coherenceScore / 100)}`}
                className={`${
                  coherenceScore >= 80
                    ? 'text-[#80FF00]'
                    : coherenceScore >= 60
                    ? 'text-yellow-500'
                    : 'text-red-500'
                }`}
                initial={{ strokeDashoffset: 2 * Math.PI * 40 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 40 * (1 - coherenceScore / 100) }}
                transition={{ duration: 1.5, ease: "easeOut" }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <motion.div
                  className={`text-xl font-bold ${
                    coherenceScore >= 80
                      ? 'text-[#80FF00]'
                      : coherenceScore >= 60
                      ? 'text-yellow-500'
                      : 'text-red-500'
                  }`}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
                >
                  {coherenceScore}%
                </motion.div>
              </div>
            </div>
          </div>
        </div>

        {careerCoherence?.strengths && careerCoherence.strengths.length > 0 && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-2 mt-2">
            <p className="text-green-600 dark:text-green-400 text-xs">
              <strong>✅ Strengths:</strong> {careerCoherence.strengths.join(', ')}
            </p>
          </div>
        )}

        {careerCoherence?.redFlags && careerCoherence.redFlags.length > 0 && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mt-4">
            <h5 className="text-red-600 dark:text-red-400 font-semibold mb-2">
              ⚠️ Potential Red Flags Detected
            </h5>
            <div className="space-y-2">
              {careerCoherence.redFlags.map((flag, index) => (
                <div key={index} className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <p className="text-red-600 dark:text-red-400 text-sm">
                      <strong>{flag.issue}</strong>
                    </p>
                    <p className="text-red-500 dark:text-red-400 text-xs mt-1">{flag.impact}</p>
                    {flag.action && (
                      <p className="text-red-600 dark:text-red-400 text-xs mt-1">
                        <strong>Action:</strong> {flag.action}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Career Trajectory Line Chart */}
      <div className="bg-gray-50 dark:bg-[#313a28] border border-gray-200 dark:border-white/10 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-[#80FF00]" />
          <h4 className="text-sm font-bold text-gray-900 dark:text-white">
            Career Progression Trajectory
          </h4>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={trajectoryData}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <defs>
                <linearGradient id="trajectoryGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#80FF00" stopOpacity={0.4} />
                  <stop offset="50%" stopColor="#80FF00" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#80FF00" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="trajectoryLineGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#80FF00" />
                  <stop offset="50%" stopColor="#a3e635" />
                  <stop offset="100%" stopColor="#80FF00" />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#e5e7eb"
                className="dark:stroke-gray-700"
                opacity={0.3}
              />
              <XAxis
                dataKey="stage"
                stroke="#6b7280"
                className="dark:stroke-gray-400"
                fontSize={12}
                tick={{ fill: 'currentColor' }}
                tickLine={{ stroke: 'currentColor' }}
              />
              <YAxis
                domain={[0, 5]}
                stroke="#6b7280"
                className="dark:stroke-gray-400"
                fontSize={12}
                tick={{ fill: 'currentColor' }}
                tickLine={{ stroke: 'currentColor' }}
                label={{
                  value: 'Career Level',
                  angle: -90,
                  position: 'insideLeft',
                  style: { textAnchor: 'middle', fill: 'currentColor' }
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="level"
                stroke="none"
                fill="url(#trajectoryGradient)"
                animationDuration={1500}
                animationEasing="ease-out"
              />
              <Line
                type="monotone"
                dataKey="level"
                stroke="url(#trajectoryLineGradient)"
                strokeWidth={4}
                dot={<CustomLabel />}
                activeDot={{ r: 10, fill: '#80FF00', stroke: '#ffffff', strokeWidth: 2 }}
                animationDuration={1500}
                animationEasing="ease-out"
              />
              <ReferenceLine y={1} stroke="#80FF00" strokeDasharray="2 2" opacity={0.3} />
              <ReferenceLine y={2} stroke="#80FF00" strokeDasharray="2 2" opacity={0.3} />
              <ReferenceLine y={3} stroke="#80FF00" strokeDasharray="2 2" opacity={0.3} />
              <ReferenceLine y={4} stroke="#80FF00" strokeDasharray="2 2" opacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Career Path Steps */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        {[
          { ...careerPath.step1, step: 1, icon: Target },
          { ...careerPath.step2, step: 2, icon: TrendingUp },
          { ...careerPath.step3, step: 3, icon: CheckCircle }
        ].map(({ title, reasoning, step, icon: Icon }, index) => (
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
            className="bg-gray-50 dark:bg-[#313a28] border border-gray-200 dark:border-white/10 rounded-lg p-4 relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 w-16 h-16 bg-[#80FF00]/10 rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="flex items-start gap-3 mb-2">
              <div className="w-8 h-8 bg-[#80FF00] rounded flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-black" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-xs font-semibold text-[#80FF00]">STEP {step}</span>
                </div>
                <h4 className="text-gray-900 dark:text-white font-semibold mb-2 text-sm">{title}</h4>
                {convertToBulletPoints(reasoning)}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      </div>
    </div>
  );
};

export default CareerTrajectoryGraph;

