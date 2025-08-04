'use client';

import React, { useState, useEffect } from 'react';
import Snippets from '@/components/dashboard/Snippets';

const TestSnippetsPage: React.FC = () => {
  const [testResults, setTestResults] = useState<any>({});

  useEffect(() => {
    // Test API endpoint
    const testAPI = async () => {
      try {
        const response = await fetch('/api/snippets?limit=5');
        const data = await response.json();
        setTestResults(prev => ({
          ...prev,
          api: {
            success: data.success,
            count: data.data?.length || 0,
            error: data.error || null
          }
        }));
      } catch (error) {
        setTestResults(prev => ({
          ...prev,
          api: {
            success: false,
            count: 0,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        }));
      }
    };

    testAPI();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Snippets Test Page</h1>
        
        {/* API Test Results */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">API Test Results</h2>
          <pre className="text-white/80 text-sm bg-black/20 p-4 rounded-lg overflow-auto">
            {JSON.stringify(testResults, null, 2)}
          </pre>
        </div>

        {/* Snippets Component Test */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Snippets Component Test</h2>
          <Snippets userAccessLevel="pro" />
        </div>
      </div>
    </div>
  );
};

export default TestSnippetsPage; 