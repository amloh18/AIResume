'use client';

import React, { useState } from 'react';
import { Template } from '@/lib/stores/templateStore';
import { CVData } from '@/lib/stores/cvStore';
import { Job } from '@/lib/stores/jobStore';
import { Sparkles, Target, TrendingUp, Lightbulb, Crown } from 'lucide-react';
import { AIService, ATSAnalysis, AIImprovement } from '@/lib/services/aiService';

interface CVSidePanelProps {
  templates: Template[];
  selectedTemplate: Template | null;
  onTemplateChange: (template: Template) => void;
  cvData: CVData;
  jobData: Job | null;
  onUpdateField: (path: string, value: any) => void;
}

const CVSidePanel: React.FC<CVSidePanelProps> = ({
  templates,
  selectedTemplate,
  onTemplateChange,
  cvData,
  jobData,
  onUpdateField
}) => {
  const [activeTab, setActiveTab] = useState<'templates' | 'ai'>('templates');
  const [atsAnalysis, setAtsAnalysis] = useState<ATSAnalysis | null>(null);
  const [isAnalyzingATS, setIsAnalyzingATS] = useState(false);
  const [isImprovingDescription, setIsImprovingDescription] = useState(false);

  // Mock user tier - in real app, this would come from user context
  const userTier = 'free'; // 'free' | 'premium'

  const handleImproveDescription = async () => {
    setIsImprovingDescription(true);
    try {
      const improvement = await AIService.improveDescription(
        cvData.personalInfo.summary || '',
        jobData,
        cvData
      );
      onUpdateField('personalInfo.summary', improvement.improvedText);
    } catch (error) {
      console.error('Error improving description:', error);
    } finally {
      setIsImprovingDescription(false);
    }
  };

  const handleAnalyzeATS = async () => {
    setIsAnalyzingATS(true);
    try {
      const analysis = await AIService.calculateATSScore(cvData, jobData);
      setAtsAnalysis(analysis);
    } catch (error) {
      console.error('Error analyzing ATS:', error);
    } finally {
      setIsAnalyzingATS(false);
    }
  };

  const calculateATSScore = () => {
    return atsAnalysis?.score || 0;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <div className="flex">
          <button
            onClick={() => setActiveTab('templates')}
            className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'templates'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Templates & Styling
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'ai'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Sparkles size={16} className="inline mr-2" />
            AI Review
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'templates' ? (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900">Choose Template</h2>
            
            <div className="space-y-3">
              {templates.map((template) => (
                <div
                  key={template.id}
                  onClick={() => onTemplateChange(template)}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedTemplate?.id === template.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">{template.name}</h3>
                      <p className="text-sm text-gray-500">{template.description}</p>
                    </div>
                    {template.isDefault && (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        Default
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {selectedTemplate && (
              <div className="mt-6">
                <h3 className="text-md font-medium text-gray-900 mb-3">Template Styles</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Primary Color
                    </label>
                    <input
                      type="color"
                      value={selectedTemplate.globalStyles.primaryColor}
                      onChange={(e) => {
                        const updatedTemplate = {
                          ...selectedTemplate,
                          globalStyles: {
                            ...selectedTemplate.globalStyles,
                            primaryColor: e.target.value
                          }
                        };
                        onTemplateChange(updatedTemplate);
                      }}
                      className="w-full h-10 border border-gray-300 rounded-md"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Font Family
                    </label>
                    <select
                      value={selectedTemplate.globalStyles.fontFamily}
                      onChange={(e) => {
                        const updatedTemplate = {
                          ...selectedTemplate,
                          globalStyles: {
                            ...selectedTemplate.globalStyles,
                            fontFamily: e.target.value
                          }
                        };
                        onTemplateChange(updatedTemplate);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Inter, system-ui, sans-serif">Inter</option>
                      <option value="Roboto, system-ui, sans-serif">Roboto</option>
                      <option value="Poppins, system-ui, sans-serif">Poppins</option>
                      <option value="Times New Roman, serif">Times New Roman</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900">AI Review</h2>
            
            {/* Job Tailoring */}
            {jobData && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Target size={16} className="text-blue-600" />
                  <h3 className="font-medium text-blue-900">Job Tailoring</h3>
                </div>
                <div className="text-sm text-blue-800">
                  <p><strong>Position:</strong> {jobData.title}</p>
                  <p><strong>Company:</strong> {jobData.company}</p>
                  <p className="mt-2">Your CV is being tailored for this specific role.</p>
                </div>
              </div>
            )}

            {/* ATS Score */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp size={16} className="text-green-600" />
                  <h3 className="font-medium text-gray-900">ATS Score</h3>
                </div>
                {!atsAnalysis && (
                  <button
                    onClick={handleAnalyzeATS}
                    disabled={isAnalyzingATS}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isAnalyzingATS ? 'Analyzing...' : 'Analyze'}
                  </button>
                )}
                {atsAnalysis && (
                  <div className="text-2xl font-bold text-green-600">
                    {calculateATSScore()}%
                  </div>
                )}
              </div>
              
              {atsAnalysis && (
                <>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                    <div 
                      className="bg-green-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${calculateATSScore()}%` }}
                    ></div>
                  </div>
                  
                  <div className="text-sm text-gray-600">
                    {calculateATSScore() >= 80 ? (
                      <p className="text-green-600">✅ Your CV is well-optimized for ATS systems!</p>
                    ) : (
                      <p className="text-orange-600">⚠️ Consider adding more relevant keywords and ensuring all required fields are filled.</p>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Keyword Suggestions */}
            {atsAnalysis && (
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb size={16} className="text-yellow-600" />
                  <h3 className="font-medium text-gray-900">Keyword Suggestions</h3>
                </div>
                
                <div className="space-y-3">
                  {atsAnalysis.missingKeywords.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Missing Keywords</h4>
                      <div className="flex flex-wrap gap-2">
                        {atsAnalysis.missingKeywords.map((keyword, index) => (
                          <span key={index} className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {atsAnalysis.suggestedSkills.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Suggested Skills</h4>
                      <div className="flex flex-wrap gap-2">
                        {atsAnalysis.suggestedSkills.map((skill, index) => (
                          <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {atsAnalysis.recommendations.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Recommendations</h4>
                      <ul className="space-y-1">
                        {atsAnalysis.recommendations.map((rec, index) => (
                          <li key={index} className="text-xs text-gray-600">• {rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* AI Description Improvement */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={16} className="text-purple-600" />
                <h3 className="font-medium text-gray-900">Improve Description</h3>
                {userTier === 'free' && (
                  <Crown size={14} className="text-yellow-500" title="Premium feature" />
                )}
              </div>
              
              {userTier === 'free' ? (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-600 mb-3">
                    Upgrade to Premium to unlock AI-powered description improvements
                  </p>
                  <button className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors">
                    Upgrade to Premium
                  </button>
                </div>
              ) : (
                <div>
                  <button
                    onClick={handleImproveDescription}
                    disabled={isImprovingDescription}
                    className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors disabled:opacity-50"
                  >
                    {isImprovingDescription ? 'Improving...' : '✨ Improve Summary'}
                  </button>
                  <p className="text-xs text-gray-500 mt-2">
                    AI will analyze your summary and suggest improvements based on the job requirements.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CVSidePanel; 