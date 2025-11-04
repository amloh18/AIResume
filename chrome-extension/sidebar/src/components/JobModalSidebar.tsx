import React from 'react';
import { useNavigate } from 'react-router-dom';
import EditJobModalSidebar from './EditJobModalSidebar';

// JobModalSidebar is a wrapper that creates a new job
// It uses EditJobModalSidebar with empty initial data
const JobModalSidebar: React.FC = () => {
  const navigate = useNavigate();
  
  // Get parsed job data from content script if available
  const [initialJobData, setInitialJobData] = React.useState<any>(null);

  React.useEffect(() => {
    // Listen for job data from content script
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'JOB_DATA_EXTRACTED') {
        setInitialJobData(event.data.jobData);
      }
    };

    window.addEventListener('message', handleMessage);
    
    // Request job data from content script
    // Use a small delay to ensure parent window is ready
    setTimeout(() => {
      if (window.parent !== window) {
        window.parent.postMessage({ type: 'REQUEST_JOB_DATA' }, '*');
      }
    }, 100);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  return (
    <EditJobModalSidebar
      initialJobData={initialJobData}
      onClose={() => navigate('/extension/dashboard')}
      isNewJob={true}
    />
  );
};

export default JobModalSidebar;

