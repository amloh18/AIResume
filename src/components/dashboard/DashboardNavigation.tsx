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
  Crown
} from 'lucide-react';

interface DashboardNavigationProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  onMembershipClick: () => void;
  user: {
    name: string;
    email: string;
    progress: number;
    subscription?: {
      planName: string;
      status: string;
      credits: number;
    };
  };
}

const DashboardNavigation: React.FC<DashboardNavigationProps> = ({
  activeSection,
  onSectionChange,
  onMembershipClick,
  user
}) => {

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
    <div className="w-56 bg-black/40 backdrop-blur-xl border-r border-white/10 min-h-screen sticky top-0 z-40">
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
      <nav className="p-6 pb-32">
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
            onClick={() => window.location.href = '/dashboard/settings'}
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

        {/* Membership Status */}
        <div className="w-full px-4 py-3 mb-4 bg-gradient-to-r from-blue-400/20 to-blue-500/20 border border-blue-400/30 rounded-xl">
          <div className="flex items-center gap-3">
            <Crown size={20} className="text-blue-400" />
            <div className="flex-1">
              <span className="font-medium text-blue-400">
                {user.subscription?.planName || 'Free Plan'}
              </span>
              <div className="text-xs text-blue-300/70">
                {user.subscription?.credits || 20} credits left
              </div>
            </div>
          </div>
        </div>

        {/* User Profile - Fixed at Bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          {/* User Info */}
          <div className="flex items-center gap-3 mb-3">
            {/* User Avatar */}
            <div className="w-10 h-10 bg-gradient-to-br from-lime-400 to-lime-500 rounded-lg flex items-center justify-center text-black font-semibold text-sm">
              {getUserInitials(user.name)}
            </div>
            
            {/* User Info */}
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{user.name}</p>
              <p className="text-white/60 text-xs truncate">{user.email}</p>
            </div>
          </div>

          {/* Logout Button */}
          <motion.button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-all duration-200 text-sm font-medium"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </motion.button>
        </div>
      </nav>
    </div>
  );
};

export default DashboardNavigation; 