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
  AlertCircle
} from 'lucide-react';

interface MockLayoutProps {
  title: string;
  description: string;
  onGenerate?: () => void;
}

// ATS Score Mock Layout (shows baseline ATS)
export const ATSMockLayout: React.FC<{ score?: number; keywords?: string[] }> = ({ 
  score = 75, 
  keywords = ['JavaScript', 'React', 'Node.js', 'Python'] 
}) => {
  return (
    <div className="space-y-4">
      {/* Baseline ATS Score */}
      <div className="bg-gray-700 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-300">Baseline ATS Readiness</h3>
          <span className="text-lg font-bold text-lime-400">{score}%</span>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-600 rounded-full h-2 mb-4">
          <div 
            className="h-2 rounded-full transition-all duration-300 bg-lime-500"
            style={{ width: `${score}%` }}
          />
        </div>

        {/* Keyword Profile */}
        <div className="mb-3">
          <h4 className="text-xs font-medium text-gray-300 mb-2">Your Keyword Profile</h4>
          <div className="flex flex-wrap gap-2">
            {keywords.map((keyword, index) => (
              <span
                key={index}
                className="text-xs bg-gray-600 text-gray-300 px-2 py-1 rounded-full"
              >
                {keyword}
              </span>
            ))}
          </div>
        </div>

        {/* Info Line */}
        <div className="text-xs text-gray-400 flex items-center space-x-1">
          <AlertCircle className="h-3 w-3" />
          <span>Select a job to see targeted keyword gaps</span>
        </div>
      </div>
    </div>
  );
};

// Content Optimizer Mock Layout
export const ContentOptimizerMockLayout: React.FC<MockLayoutProps> = ({ onGenerate }) => {
  return (
    <div className="space-y-4">
      {/* Placeholder suggestions */}
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="bg-gray-700 rounded-lg p-3">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="h-4 bg-gray-600 rounded animate-pulse mb-1" style={{ width: '70%' }} />
                <div className="h-3 bg-gray-600 rounded animate-pulse" style={{ width: '90%' }} />
              </div>
              <div className="flex space-x-1">
                <span className="text-xs bg-gray-600 text-gray-400 px-2 py-1 rounded">
                  {index === 0 ? 'Summary' : index === 1 ? 'Experience' : 'Skills'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="text-xs text-gray-400 text-center">
        Select a job to tailor rewrites to role requirements
      </div>
    </div>
  );
};

// Quantification Assistant Mock Layout
export const QuantificationMockLayout: React.FC<MockLayoutProps> = ({ onGenerate }) => {
  const mockMetrics = ['+20% efficiency', '$50K cost saved', '3× faster delivery'];
  
  return (
    <div className="space-y-4">
      {/* Placeholder metrics */}
      <div className="space-y-3">
        <div className="bg-gray-700 rounded-lg p-3">
          <div className="h-3 bg-gray-600 rounded animate-pulse mb-2" style={{ width: '60%' }} />
          <div className="flex flex-wrap gap-2">
            {mockMetrics.map((metric, index) => (
              <span
                key={index}
                className="text-xs bg-gray-600 text-gray-400 px-2 py-1 rounded-full opacity-50"
              >
                {metric}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="text-xs text-gray-400 text-center">
        Select a job to infer relevant KPIs
      </div>
    </div>
  );
};

// Skills Mapper Mock Layout
export const SkillsMapperMockLayout: React.FC<MockLayoutProps> = ({ onGenerate }) => {
  const mockJobSkills = ['React', 'AWS', 'Docker'];
  const mockYourSkills = ['JavaScript', 'Node.js', 'MongoDB'];
  
  return (
    <div className="space-y-4">
      {/* Two column layout */}
      <div className="grid grid-cols-2 gap-4">
        {/* Job Skills */}
        <div className="bg-gray-700 rounded-lg p-3">
          <h4 className="text-xs font-medium text-gray-300 mb-2">Job Skills</h4>
          <div className="space-y-1">
            {mockJobSkills.map((skill, index) => (
              <div
                key={index}
                className="h-4 bg-gray-600 rounded animate-pulse opacity-50"
                style={{ width: `${Math.random() * 40 + 60}%` }}
              />
            ))}
          </div>
        </div>

        {/* Your Skills */}
        <div className="bg-gray-700 rounded-lg p-3">
          <h4 className="text-xs font-medium text-gray-300 mb-2">Your Skills</h4>
          <div className="space-y-1">
            {mockYourSkills.map((skill, index) => (
              <div
                key={index}
                className="h-4 bg-gray-600 rounded animate-pulse opacity-50"
                style={{ width: `${Math.random() * 40 + 60}%` }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="text-xs text-gray-400 text-center">
        Link a job to map skills and gaps
      </div>
    </div>
  );
};

// Gap Analyzer Mock Layout
export const GapAnalyzerMockLayout: React.FC<MockLayoutProps> = ({ onGenerate }) => {
  return (
    <div className="space-y-4">
      {/* Placeholder gaps */}
      <div className="space-y-3">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="bg-gray-700 rounded-lg p-3">
            <div className="space-y-2">
              <div className="h-3 bg-gray-600 rounded animate-pulse opacity-50" style={{ width: '80%' }} />
              <div className="h-3 bg-gray-600 rounded animate-pulse opacity-50" style={{ width: '60%' }} />
            </div>
          </div>
        ))}
      </div>

      {/* Info */}
      <div className="text-xs text-gray-400 text-center">
        Select a job to identify qualification gaps
      </div>
    </div>
  );
};

// Achievement Generator Mock Layout
export const AchievementGeneratorMockLayout: React.FC<MockLayoutProps> = ({ onGenerate }) => {
  return (
    <div className="space-y-4">
      {/* STAR bullet placeholder */}
      <div className="bg-gray-700 rounded-lg p-3">
        <div className="space-y-2">
          <div className="h-3 bg-gray-600 rounded animate-pulse opacity-50" style={{ width: '90%' }} />
          <div className="h-3 bg-gray-600 rounded animate-pulse opacity-50" style={{ width: '75%' }} />
          <div className="h-3 bg-gray-600 rounded animate-pulse opacity-50" style={{ width: '85%' }} />
        </div>
      </div>

      {/* Info */}
      <div className="text-xs text-gray-400 text-center">
        Select a job to generate STAR-format achievements
      </div>
    </div>
  );
};

// Consistency Checker Mock Layout
export const ConsistencyCheckerMockLayout: React.FC<MockLayoutProps> = ({ onGenerate }) => {
  const mockItems = ['Date formats', 'Verb tenses', 'Bullet styles'];
  
  return (
    <div className="space-y-4">
      {/* Checklist items */}
      <div className="space-y-2">
        {mockItems.map((item, index) => (
          <div key={index} className="flex items-center space-x-2">
            <div className="w-4 h-4 border border-gray-500 rounded opacity-50" />
            <span className="text-xs text-gray-400 opacity-50">{item}</span>
          </div>
        ))}
      </div>

      {/* Info */}
      <div className="text-xs text-gray-400 text-center">
        Select a job to check formatting consistency
      </div>
    </div>
  );
};

// Summary Builder Mock Layout
export const SummaryBuilderMockLayout: React.FC<MockLayoutProps> = ({ onGenerate }) => {
  return (
    <div className="space-y-4">
      {/* Summary blocks */}
      <div className="space-y-3">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="bg-gray-700 rounded-lg p-3">
            <div className="space-y-2">
              <div className="h-3 bg-gray-600 rounded animate-pulse opacity-50" style={{ width: '100%' }} />
              <div className="h-3 bg-gray-600 rounded animate-pulse opacity-50" style={{ width: '85%' }} />
              <div className="h-3 bg-gray-600 rounded animate-pulse opacity-50" style={{ width: '70%' }} />
            </div>
          </div>
        ))}
      </div>

      {/* Info */}
      <div className="text-xs text-gray-400 text-center">
        Select a job to build tailored summaries
      </div>
    </div>
  );
};

// Cover Letter Draft Mock Layout
export const CoverLetterMockLayout: React.FC<MockLayoutProps> = ({ onGenerate }) => {
  return (
    <div className="space-y-4">
      {/* Cover letter placeholder */}
      <div className="bg-gray-700 rounded-lg p-3">
        <div className="space-y-2">
          <div className="h-3 bg-gray-600 rounded animate-pulse opacity-50" style={{ width: '100%' }} />
          <div className="h-3 bg-gray-600 rounded animate-pulse opacity-50" style={{ width: '95%' }} />
          <div className="h-3 bg-gray-600 rounded animate-pulse opacity-50" style={{ width: '80%' }} />
          <div className="h-3 bg-gray-600 rounded animate-pulse opacity-50" style={{ width: '90%' }} />
        </div>
      </div>

      {/* Info */}
      <div className="text-xs text-gray-400 text-center">
        Select a job to generate tailored cover letter
      </div>
    </div>
  );
};
