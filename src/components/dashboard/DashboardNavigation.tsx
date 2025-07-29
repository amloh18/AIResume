'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Home, 
  FileText, 
  Briefcase, 
  PenTool, 
  Archive, 
  MessageSquare, 
  BarChart3,
  Settings,
  Bell,
  Search,
  Plus,
  Sparkles,
  User,
  LogOut
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
  const sections = [
    { id: 'canvas', name: 'Canvas', icon: FileText, description: 'CV Studio' },
    { id: 'pipeline', name: 'Pipeline', icon: Briefcase, description: 'Job Tracker' },
    { id: 'inkpad', name: 'InkPad', icon: PenTool, description: 'Cover Letters' },
    { id: 'vault', name: 'Vault', icon: Archive, description: 'Saved Forms' },
    { id: 'quillbox', name: 'QuillBox', icon: MessageSquare, description: 'Snippets' },
    { id: 'pulse', name: 'Pulse', icon: BarChart3, description: 'Analytics' }
  ];

  return (
    <div className="w-64 bg-black/40 backdrop-blur-xl border-r border-white/10 min-h-screen sticky top-20">
      {/* User Profile */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-lime-400 to-lime-500 rounded-xl flex items-center justify-center">
            <Sparkles size={20} className="text-black" />
          </div>
          <div>
            <h2 className="text-white font-semibold">CVCircle</h2>
            <p className="text-white/60 text-sm">Dashboard</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-500 rounded-lg flex items-center justify-center">
            <User size={16} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{user.name}</p>
            <p className="text-white/60 text-xs truncate">{user.email}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-6">
        <div className="space-y-2">
          {/* Home Link */}
          <motion.a
            href="/"
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 text-white/60 hover:text-white hover:bg-white/5"
            whileHover={{ x: 5 }}
            whileTap={{ scale: 0.95 }}
          >
            <Home size={20} />
            <div className="text-left">
              <div className="font-medium">Home</div>
              <div className="text-xs opacity-60">Back to landing</div>
            </div>
          </motion.a>

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

        {/* Quick Actions */}
        <div className="mt-8 space-y-2">
          <motion.button
            className="w-full px-4 py-3 bg-gradient-to-r from-lime-400/20 to-lime-500/20 border border-lime-400/30 text-lime-400 rounded-xl font-medium hover:from-lime-400/30 hover:to-lime-500/30 transition-all duration-300 flex items-center justify-center gap-2"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Plus size={16} />
            New CV
          </motion.button>
        </div>

        {/* Settings & Logout */}
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

          <motion.button
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 text-white/60 hover:text-red-400 hover:bg-red-400/10"
            whileHover={{ x: 5 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              localStorage.removeItem('user');
              window.location.href = '/';
            }}
          >
            <LogOut size={20} />
            <div className="text-left">
              <div className="font-medium">Logout</div>
              <div className="text-xs opacity-60">Sign out</div>
            </div>
          </motion.button>
        </div>
      </nav>
    </div>
  );
};

export default DashboardNavigation; 