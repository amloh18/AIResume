import { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import SidebarContainer from './components/SidebarContainer';
import AuthPage from './components/AuthPage';
import JobDashboardSidebar from './components/JobDashboardSidebar';
import EditJobModalSidebar from './components/EditJobModalSidebar';
import ManualCaptureModalSidebar from './components/ManualCaptureModalSidebar';
import ExtensionSettings from './components/ExtensionSettings';
import { useExtensionAuth } from './hooks/useExtensionAuth';

function App() {
  const { isAuthenticated, isLoading, refreshAuth } = useExtensionAuth();
  
  // Refresh auth when app loads
  useEffect(() => {
    console.log('🔄 App mounted, checking authentication...');
    refreshAuth();
  }, [refreshAuth]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-dark-bg">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-lime-500 mb-4"></div>
        <p className="text-sm text-white/70">Checking authentication...</p>
      </div>
    );
  }

  console.log('✅ CVCircle Sidebar App ready', { isAuthenticated });

  return (
    <HashRouter>
      <SidebarContainer>
        <Routes>
          <Route 
            path="/extension/auth" 
            element={isAuthenticated ? <Navigate to="/extension/dashboard" replace /> : <AuthPage />} 
          />
          <Route 
            path="/extension/dashboard" 
            element={isAuthenticated ? <JobDashboardSidebar /> : <Navigate to="/extension/auth" replace />} 
          />
          <Route
            path="/extension/job/new"
            element={isAuthenticated ? <EditJobModalSidebar isNewJob={true} /> : <Navigate to="/extension/auth" replace />}
          />
          <Route 
            path="/extension/job/:id" 
            element={isAuthenticated ? <EditJobModalSidebar /> : <Navigate to="/extension/auth" replace />} 
          />
          <Route 
            path="/extension/manual" 
            element={isAuthenticated ? <ManualCaptureModalSidebar /> : <Navigate to="/extension/auth" replace />} 
          />
          <Route 
            path="/extension/settings" 
            element={isAuthenticated ? <ExtensionSettings /> : <Navigate to="/extension/auth" replace />} 
          />
          <Route 
            path="/" 
            element={<Navigate to={isAuthenticated ? "/extension/dashboard" : "/extension/auth"} replace />} 
          />
        </Routes>
      </SidebarContainer>
    </HashRouter>
  );
}

export default App;

