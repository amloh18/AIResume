'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { GraduationCap, Briefcase, Users, ArrowRight, Loader2 } from 'lucide-react';

interface RoleSelectionStepProps {
  onRoleSelect: (role: string) => void;
  isLoading: boolean;
}

const roles = [
  {
    id: 'Student',
    title: 'Student',
    description: 'Just starting my career journey.',
    icon: GraduationCap,
    color: 'from-blue-400 to-blue-600',
    available: true
  },
  {
    id: 'Professional',
    title: 'Professional',
    description: 'Looking to advance my career.',
    icon: Briefcase,
    color: 'from-lime-400 to-lime-600',
    available: true
  },
  {
    id: 'Recruiter',
    title: 'Recruiter',
    description: 'Managing candidates and applications.',
    icon: Users,
    color: 'from-purple-400 to-purple-600',
    available: false
  }
];

export default function RoleSelectionStep({ onRoleSelect, isLoading }: RoleSelectionStepProps) {
  const handleRoleClick = (role: typeof roles[0]) => {
    if (role.available && !isLoading) {
      onRoleSelect(role.id);
    }
  };

  return (
    <div className="text-center space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
          How do you plan to use <span className="text-lime-400">CVCircle</span>?
        </h1>
        <p className="text-xl text-white/60 max-w-2xl mx-auto">
          This helps us personalize your experience and provide the most relevant features for your needs.
        </p>
      </motion.div>

      {/* Role Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        {roles.map((role, index) => (
          <motion.div
            key={role.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            whileHover={{ 
              scale: role.available ? 1.02 : 1,
              y: role.available ? -5 : 0,
              transition: { duration: 0.2 }
            }}
            whileTap={{ scale: role.available ? 0.98 : 1 }}
            onClick={() => handleRoleClick(role)}
            className={`group perspective-1000 h-80 ${
              role.available && !isLoading ? 'cursor-pointer' : 'cursor-not-allowed'
            }`}
          >
            <div className="relative w-full h-full transition-all duration-500">
              <div className={`absolute inset-0 backface-hidden bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 transition-all duration-300 overflow-hidden ${
                role.available 
                  ? 'hover:bg-white/10 hover:border-white/20' 
                  : 'opacity-60'
              }`}>
                {/* Coming Soon Badge */}
                {!role.available && (
                  <motion.div
                    className="absolute -top-3 -right-3 bg-gradient-to-r from-orange-400 to-orange-500 text-black px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 shadow-lg z-50"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                  >
                    Coming Soon
                  </motion.div>
                )}

                {/* Content Container */}
                <div className="flex flex-col h-full">
                  {/* Icon */}
                  <div className={`w-14 h-14 bg-gradient-to-br ${role.color} rounded-2xl flex items-center justify-center mb-4 mx-auto transition-transform duration-300 ${
                    role.available ? 'group-hover:scale-110' : ''
                  }`}>
                    <div className="text-white">
                      <role.icon size={32} />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 flex flex-col justify-center">
                    <h3 className="text-2xl font-bold text-white mb-3 text-center">
                      {role.title}
                    </h3>
                    <p className="text-white/60 text-base leading-relaxed mb-4 text-center">
                      {role.description}
                    </p>
                  </div>

                  {/* Arrow */}
                  <div className="flex justify-center mt-auto">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                      role.available 
                        ? 'bg-white/10 group-hover:bg-lime-400 group-hover:text-black' 
                        : 'bg-white/5'
                    }`}>
                      {isLoading ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <ArrowRight size={16} className={role.available ? 'text-white group-hover:text-black' : 'text-white/30'} />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="text-white/40 text-sm"
      >
        <p>Choose your role to continue with the setup process</p>
      </motion.div>
    </div>
  );
}
