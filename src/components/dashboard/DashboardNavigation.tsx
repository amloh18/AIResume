'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  Briefcase, 
  PenTool, 
  Archive, 
  MessageSquare, 
  BarChart3,
  Settings,
  Sparkles,
  User,
  LogOut,
  ChevronDown,
  UserCircle,
  Bell,
  Shield,
  HelpCircle
} from 'lucide-react';

interface DashboardNavigationProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  user: {
    name: string;
    email: string;
    progress: number;
  };
}

const DashboardNavigation: React.FC<DashboardNavigationProps> = ({
  activeSection,
  onSectionChange,
  user
}) => {
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const sections = [
    { id: 'pulse', name: 'Analytics', icon: BarChart3, description: 'Progress Tracking' },
    { id: 'pipeline', name: 'Job Tracker', icon: Briefcase, description: 'Track Applications' },
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

  const handleLogout = () => {
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  return (
    <div className={`w-64 bg-black/40 backdrop-blur-xl border-r border-white/10 min-h-screen sticky relative z-40 ${activeSection === 'pipeline' ? 'top-0' : 'top-20'}`}>
      {/* Logo and Title */}
      <div className="p-6 border-b border-white/10">
        <div className="text-center mb-6">
          <div className="text-3xl font-bold mb-2">
            <span className="text-lime-400 drop-shadow-lg">CV</span>
            <span className="text-gray-300">CIRCLE</span>
          </div>
          <h2 className="text-white/80 text-lg font-medium">Dashboard</h2>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-6">
        <div className="space-y-2">
          {/* Section Navigation */}
          {sections.map((section, index) => (
            <motion.button
              key={section.id}
              onClick={() => onSectionChange(section.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
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
                size={20} 
                className={`transition-colors ${
                  activeSection === section.id ? 'text-lime-400' : 'text-white/60 group-hover:text-white'
                }`}
              />
              <div className="text-left">
                <div className="font-medium">{section.name}</div>
                <div className="text-xs opacity-60">{section.description}</div>
              </div>
            </motion.button>
          ))}
        </div>

        {/* Settings */}
        <div className="mt-8 pt-6 border-t border-white/10 space-y-2">
          <motion.button
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 text-white/60 hover:text-white hover:bg-white/5"
            whileHover={{ x: 5 }}
            whileTap={{ scale: 0.95 }}
          >
            <Settings size={20} />
            <div className="text-left">
              <div className="font-medium">Settings</div>
              <div className="text-xs opacity-60">Preferences</div>
            </div>
          </motion.button>
        </div>

        {/* User Profile Dropdown */}
        <div className="mt-6 pt-6 border-t border-white/10 relative">
          <motion.button
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className="w-full flex items-center gap-3 p-3 bg-white/5 rounded-xl transition-all duration-300 hover:bg-white/10 group"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {/* User Avatar */}
            <div className="w-10 h-10 bg-gradient-to-br from-lime-400 to-lime-500 rounded-lg flex items-center justify-center text-black font-semibold text-sm">
              {getUserInitials(user.name)}
            </div>
            
            {/* User Info */}
            <div className="flex-1 min-w-0 text-left">
              <p className="text-white text-sm font-medium truncate">{user.name}</p>
              <p className="text-white/60 text-xs truncate">{user.email}</p>
            </div>
            
            {/* Dropdown Arrow */}
            <motion.div
              animate={{ rotate: showUserDropdown ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown size={16} className="text-white/60 group-hover:text-white transition-colors" />
            </motion.div>
          </motion.button>

          {/* Dropdown Menu */}
          <AnimatePresence>
            {showUserDropdown && (
              <motion.div
                className="absolute bottom-full left-0 right-0 mb-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl overflow-hidden"
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <div className="p-2 space-y-1">
                  {/* Profile */}
                  <motion.button
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-all duration-200 text-sm"
                    whileHover={{ x: 3 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <UserCircle size={16} />
                    <span>Profile</span>
                  </motion.button>

                  {/* Notifications */}
                  <motion.button
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-all duration-200 text-sm"
                    whileHover={{ x: 3 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Bell size={16} />
                    <span>Notifications</span>
                  </motion.button>

                  {/* Security */}
                  <motion.button
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-all duration-200 text-sm"
                    whileHover={{ x: 3 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Shield size={16} />
                    <span>Security</span>
                  </motion.button>

                  {/* Help */}
                  <motion.button
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-all duration-200 text-sm"
                    whileHover={{ x: 3 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <HelpCircle size={16} />
                    <span>Help & Support</span>
                  </motion.button>

                  {/* Divider */}
                  <div className="border-t border-white/10 my-1"></div>

                  {/* Logout */}
                  <motion.button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-all duration-200 text-sm"
                    whileHover={{ x: 3 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <LogOut size={16} />
                    <span>Sign Out</span>
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </nav>
    </div>
  );
};

export default DashboardNavigation; 