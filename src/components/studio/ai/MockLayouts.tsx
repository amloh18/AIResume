import React from 'react';
import { 
  Target, 
  Zap, 
  TrendingUp, 
  Brain, 
  BarChart3, 
  Star, 
  CheckCircle, 
  FileText,
  MessageSquare,
  Wand2,
  AlertCircle
} from 'lucide-react';

interface ATSMockLayoutProps {
  score?: number;
  keywords?: string[];
}

export const ATSMockLayout: React.FC<ATSMockLayoutProps> = ({ score, keywords = [] }) => {
  const displayScore = score || 75;
  const displayKeywords = keywords.length > 0 
    ? keywords.slice(0, 8) 
    : ['JavaScript', 'React', 'TypeScript', 'Node.js', 'AWS', 'Docker', 'Git', 'CI/CD'];

  return (
    <div className="space-y-4">
      {/* ATS Score Display */}
      <div className="flex items-center justify-center">
        <div className="relative w-20 h-20">
          <svg className="transform -rotate-90 w-20 h-20">
            <circle
              cx="40"
              cy="40"
              r="36"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              className="text-gray-300"
            />
            <circle
              cx="40"
              cy="40"
              r="36"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              strokeDasharray={`${(displayScore / 100) * 226.2} 226.2`}
              className="text-lime-500"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold text-gray-700">{displayScore}%</span>
          </div>
        </div>
      </div>

      {/* Keywords */}
      <div>
        <div className="text-xs text-gray-500 mb-2">Sample Keywords (Select a job for tailored analysis)</div>
        <div className="flex flex-wrap gap-2">
          {displayKeywords.map((keyword, index) => (
            <span
              key={index}
              className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded-full"
            >
              {keyword}
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center space-x-2 text-xs text-gray-500 bg-yellow-50 p-2 rounded">
        <AlertCircle className="h-3 w-3 text-yellow-600" />
        <span>Select a job to get personalized ATS analysis</span>
      </div>
    </div>
  );
};

interface MockLayoutWithGenerateProps {
  onGenerate?: () => void;
}

export const ContentOptimizerMockLayout: React.FC<MockLayoutWithGenerateProps> = ({ onGenerate }) => {
  return (
    <div className="space-y-3 text-center py-6">
      <Zap className="h-12 w-12 text-gray-400 mx-auto mb-3" />
      <p className="text-sm text-gray-600 mb-2">
        Optimize your CV content to match job requirements
      </p>
      <p className="text-xs text-gray-500 mb-4">
        Select a job to get tailored content optimization suggestions
      </p>
      <div className="flex flex-wrap gap-2 justify-center">
        {['Improve clarity', 'Add keywords', 'Quantify achievements'].map((tip, i) => (
          <span key={i} className="px-2 py-1 bg-gray-200 text-gray-600 text-xs rounded">
            {tip}
          </span>
        ))}
      </div>
    </div>
  );
};

export const QuantificationMockLayout: React.FC<MockLayoutWithGenerateProps> = ({ onGenerate }) => {
  return (
    <div className="space-y-3 text-center py-6">
      <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-3" />
      <p className="text-sm text-gray-600 mb-2">
        Add numbers and metrics to your achievements
      </p>
      <p className="text-xs text-gray-500 mb-4">
        Select a job to get quantification suggestions
      </p>
      <div className="flex flex-col gap-2 text-left">
        {['Increased revenue by X%', 'Managed team of Y members', 'Reduced costs by Z%'].map((example, i) => (
          <div key={i} className="px-3 py-2 bg-gray-100 text-gray-600 text-xs rounded flex items-center space-x-2">
            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
            <span>{example}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const SkillsMapperMockLayout: React.FC<MockLayoutWithGenerateProps> = ({ onGenerate }) => {
  return (
    <div className="space-y-3 text-center py-6">
      <Brain className="h-12 w-12 text-gray-400 mx-auto mb-3" />
      <p className="text-sm text-gray-600 mb-2">
        Map your skills to job requirements
      </p>
      <p className="text-xs text-gray-500 mb-4">
        Select a job to see skill alignment analysis
      </p>
      <div className="space-y-2">
        <div className="flex items-center justify-between px-3 py-2 bg-gray-100 rounded text-xs">
          <span className="text-gray-700">JavaScript</span>
          <span className="text-green-600">✓ Match</span>
        </div>
        <div className="flex items-center justify-between px-3 py-2 bg-gray-100 rounded text-xs">
          <span className="text-gray-700">Python</span>
          <span className="text-yellow-600">? Partial</span>
        </div>
      </div>
    </div>
  );
};

export const GapAnalyzerMockLayout: React.FC<MockLayoutWithGenerateProps> = ({ onGenerate }) => {
  return (
    <div className="space-y-3 text-center py-6">
      <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-3" />
      <p className="text-sm text-gray-600 mb-2">
        Identify gaps between your CV and job requirements
      </p>
      <p className="text-xs text-gray-500 mb-4">
        Select a job to analyze skill and experience gaps
      </p>
      <div className="space-y-2 text-left">
        {['Missing: 3+ years Python', 'Recommendation: Add AWS certification'].map((gap, i) => (
          <div key={i} className="px-3 py-2 bg-yellow-50 border border-yellow-200 text-yellow-800 text-xs rounded">
            {gap}
          </div>
        ))}
      </div>
    </div>
  );
};

export const AchievementGeneratorMockLayout: React.FC<MockLayoutWithGenerateProps> = ({ onGenerate }) => {
  return (
    <div className="space-y-3 text-center py-6">
      <Star className="h-12 w-12 text-gray-400 mx-auto mb-3" />
      <p className="text-sm text-gray-600 mb-2">
        Generate impactful achievement statements
      </p>
      <p className="text-xs text-gray-500 mb-4">
        Select a job to get tailored achievement suggestions
      </p>
      <div className="space-y-2 text-left">
        {[
          'Led team to increase productivity by 25%',
          'Implemented system that saved $50K annually'
        ].map((achievement, i) => (
          <div key={i} className="px-3 py-2 bg-blue-50 border border-blue-200 text-blue-800 text-xs rounded">
            {achievement}
          </div>
        ))}
      </div>
    </div>
  );
};

export const ConsistencyCheckerMockLayout: React.FC<MockLayoutWithGenerateProps> = ({ onGenerate }) => {
  return (
    <div className="space-y-3 text-center py-6">
      <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
      <p className="text-sm text-gray-600 mb-2">
        Check consistency and ATS compliance
      </p>
      <p className="text-xs text-gray-500 mb-4">
        Select a job to verify CV consistency
      </p>
      <div className="space-y-2 text-left">
        {['Date format consistency', 'Spelling & grammar', 'ATS-friendly formatting'].map((check, i) => (
          <div key={i} className="flex items-center space-x-2 px-3 py-2 bg-gray-100 rounded text-xs">
            <CheckCircle className="h-3 w-3 text-gray-500" />
            <span className="text-gray-700">{check}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const SummaryBuilderMockLayout: React.FC<MockLayoutWithGenerateProps> = ({ onGenerate }) => {
  return (
    <div className="space-y-3 text-center py-6">
      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
      <p className="text-sm text-gray-600 mb-2">
        Build a tailored professional summary
      </p>
      <p className="text-xs text-gray-500 mb-4">
        Select a job to generate a customized summary
      </p>
      <div className="bg-gray-100 rounded p-3 text-left">
        <p className="text-xs text-gray-600 italic">
          "Experienced professional with expertise in [field]. 
          Proven track record of [achievement]. 
          Looking to leverage skills in [role]..."
        </p>
      </div>
    </div>
  );
};

export const CoverLetterMockLayout: React.FC<MockLayoutWithGenerateProps> = ({ onGenerate }) => {
  return (
    <div className="space-y-3 text-center py-6">
      <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-3" />
      <p className="text-sm text-gray-600 mb-2">
        Generate a personalized cover letter
      </p>
      <p className="text-xs text-gray-500 mb-4">
        Select a job to create a tailored cover letter draft
      </p>
      <div className="bg-gray-100 rounded p-3 text-left space-y-2">
        <div className="text-xs text-gray-600">
          <p className="font-semibold mb-1">Opening paragraph:</p>
          <p className="italic">"I am writing to express my interest in the [Position] role at [Company]..."</p>
        </div>
        <div className="text-xs text-gray-600">
          <p className="font-semibold mb-1">Body paragraph:</p>
          <p className="italic">"With [X] years of experience in [field], I bring..."</p>
        </div>
      </div>
    </div>
  );
};

