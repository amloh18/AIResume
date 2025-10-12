'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '@/lib/contexts/ThemeContext';

interface LoadingDashboardProps {
  message?: string;
}

const LoadingDashboard: React.FC<LoadingDashboardProps> = ({ 
  message = "Loading Dashboard..." 
}) => {
  const { theme, isDark } = useTheme();
  const [currentFact, setCurrentFact] = useState<string>('');
  const [isLoadingFact, setIsLoadingFact] = useState(false);

  // Fallback facts in case API fails
  const fallbackFacts = [
    "The average job search takes 3-6 months, but with a strong CV, you can reduce this time significantly.",
    "Recruiters spend only 6 seconds scanning a CV before deciding whether to read it in detail.",
    "Customizing your CV for each job application increases your chances of getting an interview by 40%.",
    "A well-written cover letter can increase your interview chances by 50% compared to applications without one.",
    "Networking accounts for 70% of all job placements, but a strong CV is still your first impression."
  ];

  // Initialize with a fallback fact immediately
  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * fallbackFacts.length);
    setCurrentFact(fallbackFacts[randomIndex]);
  }, []);

  const fetchRandomFact = async () => {
    if (isLoadingFact) return;
    
    setIsLoadingFact(true);
    try {
      // Try multiple free APIs for facts
      const apis = [
        'https://uselessfacts.jsph.pl/random.json?language=en',
        'https://catfact.ninja/fact',
        'https://dogapi.dog/api/v2/facts?limit=1'
      ];

      for (const apiUrl of apis) {
        try {
          const response = await fetch(apiUrl);
          if (response.ok) {
            const data = await response.json();
            let fact = '';
            
            if (apiUrl.includes('uselessfacts')) {
              fact = data.text;
            } else if (apiUrl.includes('catfact')) {
              fact = data.fact;
            } else if (apiUrl.includes('dogapi')) {
              fact = data.data?.[0]?.attributes?.body || data.fact;
            }
            
            if (fact && fact.length > 10) {
              setCurrentFact(fact);
              setIsLoadingFact(false);
              return;
            }
          }
        } catch (apiError) {
          console.log(`API ${apiUrl} failed, trying next...`);
          continue;
        }
      }
    } catch (error) {
      console.log('All APIs failed, using fallback facts');
    }

    // Fallback to local facts
    const randomIndex = Math.floor(Math.random() * fallbackFacts.length);
    setCurrentFact(fallbackFacts[randomIndex]);
    setIsLoadingFact(false);
  };

  useEffect(() => {
    // Fetch new fact every 4 seconds (starts after initial fact is already shown)
    const interval = setInterval(() => {
      fetchRandomFact();
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="text-center max-w-2xl mx-auto px-6">
        {/* Loading Spinner */}
        <div className="mb-8">
          <div className={`animate-spin rounded-full h-16 w-16 border-4 mx-auto ${isDark ? 'border-gray-700 border-t-blue-400' : 'border-blue-200 border-t-blue-600'}`}></div>
        </div>

        {/* Main Message */}
        <h2 className={`text-xl font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {message}
        </h2>

        {/* Did You Know Section */}
        <div className={`rounded-xl p-6 shadow-lg border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">💡</span>
            </div>
            <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Did you know?
            </h3>
          </div>
          
          <div className="min-h-[60px] flex items-center">
            <p className={`text-sm leading-relaxed italic ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              "{currentFact}"
            </p>
          </div>

          {/* Loading Indicator */}
          <div className="flex justify-center items-center gap-2 mt-4">
            <div className="flex gap-1">
              <div className={`w-2 h-2 rounded-full animate-bounce ${isDark ? 'bg-blue-400' : 'bg-blue-600'}`}></div>
              <div className={`w-2 h-2 rounded-full animate-bounce ${isDark ? 'bg-blue-400' : 'bg-blue-600'}`} style={{ animationDelay: '0.1s' }}></div>
              <div className={`w-2 h-2 rounded-full animate-bounce ${isDark ? 'bg-blue-400' : 'bg-blue-600'}`} style={{ animationDelay: '0.2s' }}></div>
            </div>
            {isLoadingFact && (
              <span className={`text-xs ml-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Fetching new fact...
              </span>
            )}
          </div>
        </div>

        {/* Additional Info */}
        <p className={`text-xs mt-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          Preparing your personalized dashboard...
        </p>
      </div>
    </div>
  );
};

export default LoadingDashboard;
