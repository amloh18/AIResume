'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  FileText, 
  Briefcase, 
  PenTool, 
  Archive, 
  MessageSquare, 
  BarChart3,
  LogOut,
  Shield,
  Route
} from 'lucide-react';

interface DashboardNavigationProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  onMembershipClick: () => void;
  user: {
    name: string;
    email: string;
    username?: string;
    progress: number;
    profilePhoto?: string;
    subscription?: {
      planName: string;
      status: string;
      credits: number;
    };
  };
  isOpen?: boolean;
  onClose?: () => void;
}

const DashboardNavigation: React.FC<DashboardNavigationProps> = ({
  activeSection,
  onSectionChange,
  onMembershipClick,
  user,
  isOpen = true,
  onClose
}) => {
  const { data: session } = useSession();
  const router = useRouter();
  
  // Check if user is admin
  const isAdmin = (session as any)?.user?.role === 'admin';

  const sections = [
    { id: 'analytics', name: 'Analytics', icon: BarChart3, description: 'Progress Tracking' },
    { id: 'pipeline', name: 'Job Tracker', icon: Briefcase, description: 'Track Applications' },
    { id: 'cv-journey', name: 'CV Journey', icon: Route, description: 'Guided CV Creation' },
    { id: 'canvas', name: 'CV Studio', icon: FileText, description: 'Create & Edit CVs' },
    { id: 'inkpad', name: 'Cover Letters', icon: PenTool, description: 'Generate Letters' },
    { id: 'vault', name: 'Saved Forms', icon: Archive, description: 'Store Data' },
    { id: 'quillbox', name: 'Snippets', icon: MessageSquare, description: 'Content Library' }
  ];

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleLogout = async () => {
    // Clear localStorage
    localStorage.removeItem('user');
    // Clear sessionStorage
    sessionStorage.clear();
    // Sign out from NextAuth
    await signOut({ 
      redirect: true,
      callbackUrl: '/'
    });
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed lg:sticky top-0 z-50 h-screen pt-8 xl:pt-4
        bg-black/40 backdrop-blur-xl border-r border-white/10
        transition-all duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        w-56 lg:w-48
      `}>
      {/* Logo */}
      <div className="p-4 border-b border-white/10">
        <div className="text-center mb-2">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-xl font-bold mb-2 hover:opacity-90 transition-opacity"
          >
            <span className="text-lime-400 drop-shadow-lg">CV</span>
            <span className="text-gray-300">CIRCLE</span>
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-4 pb-20 mt-8">
        {/* Section Separator */}
        <div className="mb-6">
          <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
        </div>
        <div className="space-y-2">
          {/* Section Navigation */}
          {sections.map((section, index) => (
            <motion.button
              key={section.id}
              onClick={() => onSectionChange(section.id)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-300 group ${
                activeSection === section.id
                  ? 'bg-gradient-to-r from-lime-400/20 to-lime-500/20 border border-lime-400/30 text-lime-400'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
              whileHover={{ x: 5 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + index * 0.1 }}
            >
              <section.icon 
                size={18} 
                className={`transition-colors ${
                  activeSection === section.id ? 'text-lime-400' : 'text-white/60 group-hover:text-white'
                }`}
              />
              <div className="text-left">
                <div className="text-sm font-medium">{section.name}</div>
                <div className="hidden xl:block text-xs opacity-60">{section.description}</div>
              </div>
            </motion.button>
          ))}
        </div>


      </nav>

      {/* Footer Actions - Fixed at Bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-6 space-y-3">
        {/* Admin Button - Only show for admin users */}
        {isAdmin && (
          <motion.button
            onClick={() => router.push('/admin')}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-300 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 border border-purple-500/20"
            whileHover={{ x: 5 }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Shield size={20} />
            <div className="text-left">
              <div className="text-sm font-medium">Admin</div>
              <div className="text-xs opacity-60">System Management</div>
            </div>
          </motion.button>
        )}

        {/* Logout Button */}
        <motion.button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg transition-all duration-200 text-sm font-medium shadow-lg hover:shadow-red-500/25"
          whileHover={{ scale: 1.02, boxShadow: "0 10px 25px -5px rgba(239, 68, 68, 0.4)" }}
          whileTap={{ scale: 0.98 }}
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </motion.button>
      </div>
      </div>
    </>
  );
};

export default DashboardNavigation; 