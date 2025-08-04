'use client';

import React, { useState } from 'react';
import AIAssistantPanel from '@/components/cv-studio/AIAssistantPanel';

const TestAIAssistantPage: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showPanel, setShowPanel] = useState(true);

  const sampleJobs = [
    {
      id: '1',
      title: 'Data Analyst',
      company: 'Google',
      description: 'Analyze data and create insights',
      status: 'active'
    },
    {
      id: '2',
      title: 'Marketing Lead',
      company: 'Shopify',
      description: 'Lead marketing campaigns',
      status: 'active'
    },
    {
      id: '3',
      title: 'Product Manager',
      company: 'Notion',
      description: 'Manage product development',
      status: 'active'
    }
  ];

  const handleApplySuggestion = (suggestion: any) => {
    console.log('Applying suggestion:', suggestion);
  };

  const handleGenerateContent = (type: string, context: string) => {
    console.log('Generating content:', type, context);
  };

  const handleApplySnippet = (snippet: any) => {
    console.log('Applying snippet:', snippet);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Main content area */}
      <div className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">AI Assistant Panel Test</h1>
          
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-xl font-semibold mb-4">CV Content Area</h2>
            <p className="text-gray-600 mb-4">
              This is a test page to verify the AI Assistant panel functionality. 
              The panel should appear on the right side with all the features from the guide.
            </p>
            
            <div className="space-y-4">
              <div className="p-4 border border-gray-200 rounded-lg">
                <h3 className="font-medium mb-2">Sample CV Content</h3>
                <p className="text-sm text-gray-700">
                  Experienced professional with 5+ years in data analysis and strategic planning. 
                  Proficient in SQL, Python, and data visualization tools. Led cross-functional teams 
                  to deliver projects on time and under budget.
                </p>
              </div>
              
              <div className="flex gap-4">
                <button
                  onClick={() => setShowPanel(!showPanel)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {showPanel ? 'Hide' : 'Show'} AI Assistant
                </button>
                
                <button
                  onClick={() => setIsCollapsed(!isCollapsed)}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  {isCollapsed ? 'Expand' : 'Collapse'} Panel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Assistant Panel */}
      {showPanel && (
        <AIAssistantPanel
          onApplySuggestion={handleApplySuggestion}
          onGenerateContent={handleGenerateContent}
          onApplySnippet={handleApplySnippet}
          currentSection="experience"
          currentContent="Experienced professional with 5+ years in data analysis and strategic planning. Proficient in SQL, Python, and data visualization tools."
          availableJobs={sampleJobs}
          onClose={() => setShowPanel(false)}
          isCollapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
        />
      )}
    </div>
  );
};

export default TestAIAssistantPage; 