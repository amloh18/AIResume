'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { User, GraduationCap, Briefcase, ArrowRight } from 'lucide-react';
import { UserRole } from '@/types/cv';

interface RoleSelectionProps {
  onRoleSelect: (role: UserRole) => void;
}

const roles: UserRole[] = [
  {
    id: 'student',
    title: 'Student',
    description: 'I\'m a student looking to create my first professional CV',
    icon: 'GraduationCap',
    color: 'from-blue-400 to-blue-600'
  },
  {
    id: 'professional',
    title: 'Professional',
    description: 'I\'m a working professional looking to enhance my CV',
    icon: 'Briefcase',
    color: 'from-lime-400 to-lime-600'
  },
  {
    id: 'recruiter',
    title: 'Recruiter',
    description: 'I\'m a recruiter looking to manage candidate profiles',
    icon: 'User',
    color: 'from-purple-400 to-purple-600'
  }
];

const getIcon = (iconName: string) => {
  switch (iconName) {
    case 'GraduationCap':
      return <GraduationCap size={32} />;
    case 'Briefcase':
      return <Briefcase size={32} />;
    case 'User':
      return <User size={32} />;
    default:
      return <User size={32} />;
  }
};

export default function RoleSelection({ onRoleSelect }: RoleSelectionProps) {
  return (
    <div className="text-center space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
          Welcome to <span className="text-lime-400">CVCircle</span>
        </h1>
        <p className="text-xl text-white/60 max-w-2xl mx-auto">
          Let's get started by understanding your role. This helps us personalize your experience.
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
              scale: 1.02,
              y: -5,
              transition: { duration: 0.2 }
            }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onRoleSelect(role)}
            className="group cursor-pointer"
          >
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all duration-300 hover:border-white/20">
              {/* Icon */}
              <div className={`w-16 h-16 bg-gradient-to-br ${role.color} rounded-2xl flex items-center justify-center mb-6 mx-auto group-hover:scale-110 transition-transform duration-300`}>
                <div className="text-white">
                  {getIcon(role.icon)}
                </div>
              </div>

              {/* Content */}
              <h3 className="text-2xl font-bold text-white mb-3">
                {role.title}
              </h3>
              <p className="text-white/60 text-lg leading-relaxed mb-6">
                {role.description}
              </p>

              {/* Arrow */}
              <div className="flex justify-center">
                <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center group-hover:bg-lime-400 group-hover:text-black transition-all duration-300">
                  <ArrowRight size={20} />
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
