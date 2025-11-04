import React from 'react';
import EditJobModalSidebar from './EditJobModalSidebar';

// ManualCaptureModalSidebar is a wrapper for creating a job manually
// It uses EditJobModalSidebar with empty initial data
const ManualCaptureModalSidebar: React.FC = () => {
  return (
    <EditJobModalSidebar
      initialJobData={null}
      isNewJob={true}
    />
  );
};

export default ManualCaptureModalSidebar;

