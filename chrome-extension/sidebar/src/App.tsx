import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import SidebarContainer from './components/SidebarContainer';
import AuthPage from './components/AuthPage';
import JobDashboardSidebar from './components/JobDashboardSidebar';
import JobModalSidebar from './components/JobModalSidebar';
import EditJobModalSidebar from './components/EditJobModalSidebar';
import ManualCaptureModalSidebar from './components/ManualCaptureModalSidebar';
import ExtensionSettings from './components/ExtensionSettings';
import { useExtensionAuth } from './hooks/useExtensionAuth';

function App() {
  const { isAuthenticated, isLoading } = useExtensionAuth();
  
  // Log for debugging
  if (typeof window !== 'undefined') {
    console.log('✅ CVCircle Sidebar App loaded', { isAuthenticated, isLoading });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lime-500"></div>
      </div>
    );
  }

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
            element={isAuthenticated ? <JobModalSidebar /> : <Navigate to="/extension/auth" replace />} 
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

