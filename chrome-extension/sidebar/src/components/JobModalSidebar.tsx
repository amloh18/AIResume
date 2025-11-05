import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';
import EditJobModalSidebar from './EditJobModalSidebar';
import { useExtensionAuth } from '../hooks/useExtensionAuth';

// JobModalSidebar is a wrapper that creates a new job
// It uses EditJobModalSidebar with extracted job data
const JobModalSidebar: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useExtensionAuth();
  
  // Get parsed job data from content script if available
  const [initialJobData, setInitialJobData] = React.useState<any>(null);
  const [isExtracting, setIsExtracting] = React.useState(true);
  const [extractionError, setExtractionError] = React.useState<string | null>(null);

  React.useEffect(() => {
    // Check authentication first
    if (!authLoading && !isAuthenticated) {
      console.log('⚠️ User not authenticated, redirecting to auth page');
      navigate('/extension/auth');
      return;
    }

    if (!isAuthenticated) {
      return; // Wait for auth check to complete
    }

    let hasReceivedData = false;
    let timeoutId: NodeJS.Timeout;

    // Listen for job data from content script
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'JOB_DATA_EXTRACTED' && event.data.jobData) {
        console.log('✅ Received job data from content script:', event.data.jobData);
        hasReceivedData = true;
        clearTimeout(timeoutId);
        setInitialJobData(event.data.jobData);
        setIsExtracting(false);
        
        // Check if we got meaningful job data
        const hasData = event.data.jobData.title || event.data.jobData.jobTitle || event.data.jobData.company;
        if (!hasData) {
          setExtractionError('Could not extract job data from page. Please fill in manually.');
        }
      }
    };

    window.addEventListener('message', handleMessage);
    
    // Request job data from content script
    const timer = setTimeout(() => {
      console.log('📤 Requesting job data from content script...');
      if (window.parent !== window) {
        window.parent.postMessage({ type: 'REQUEST_JOB_DATA' }, '*');
      }
      
      // Set timeout for extraction (3 seconds)
      timeoutId = setTimeout(() => {
        if (!hasReceivedData) {
          console.log('⏱️ Job extraction timeout, showing empty form');
          setIsExtracting(false);
          setExtractionError('Could not extract job data. Please fill in manually.');
        }
      }, 3000);
    }, 100);

    return () => {
      window.removeEventListener('message', handleMessage);
      clearTimeout(timer);
      clearTimeout(timeoutId);
    };
  }, [navigate, isAuthenticated, authLoading]);

  // Show loading while checking auth or extracting
  if (authLoading || (isExtracting && !initialJobData)) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="animate-spin text-lime-500" size={32} />
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {authLoading ? 'Checking authentication...' : 'Extracting job details...'}
        </p>
      </div>
    );
  }

  return (
    <div>
      {extractionError && (
        <div className="mx-6 mt-6 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-start gap-2">
          <AlertCircle size={18} className="text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-yellow-800 dark:text-yellow-200">{extractionError}</p>
        </div>
      )}
      <EditJobModalSidebar
        initialJobData={initialJobData}
        onClose={() => navigate('/extension/dashboard')}
        isNewJob={true}
      />
    </div>
  );
};

export default JobModalSidebar;

