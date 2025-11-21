'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, GraduationCap, Briefcase, ArrowRight, Lock, Clock } from 'lucide-react';
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
    color: 'from-blue-400 to-blue-600',
    available: true
  },
  {
    id: 'professional',
    title: 'Professional',
    description: 'I\'m a working professional looking to enhance my CV',
    icon: 'Briefcase',
    color: 'from-lime-400 to-lime-600',
    available: true
  },
  {
    id: 'recruiter',
    title: 'Recruiter',
    description: 'I\'m a recruiter looking to manage candidate profiles',
    icon: 'User',
    color: 'from-purple-400 to-purple-600',
    available: false
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
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set());

  const handleRoleClick = (role: UserRole) => {
    if (role.available) {
      onRoleSelect(role);
    } else {
      // Toggle flip state for unavailable cards
      const newFlippedCards = new Set(flippedCards);
      if (newFlippedCards.has(role.id)) {
        newFlippedCards.delete(role.id);
      } else {
        newFlippedCards.add(role.id);
      }
      setFlippedCards(newFlippedCards);
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
        <h1 className="text-4xl tablet:text-5xl font-bold text-white mb-4">
          Welcome to <span className="text-lime-400">CVCircle</span>
        </h1>
        <p className="text-xl text-white/60 max-w-2xl mx-auto">
          Let's get started by understanding your role. This helps us personalize your experience.
        </p>
      </motion.div>

      {/* Role Cards */}
      <div className="grid grid-cols-1 tablet:grid-cols-3 gap-6 max-w-4xl mx-auto">
        {roles.map((role, index) => {
          const isFlipped = flippedCards.has(role.id);
          
          return (
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
              className={`group perspective-1000 h-80 ${role.available ? 'cursor-pointer' : 'cursor-pointer'}`}
            >
              <div className={`relative w-full h-full transition-all duration-500 transform-style-preserve-3d ${
                isFlipped ? 'rotate-y-180' : ''
              }`}>
                {/* Front of Card */}
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
                      <Lock size={12} />
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
                        {getIcon(role.icon)}
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
                        <ArrowRight size={16} className={role.available ? 'text-white group-hover:text-black' : 'text-white/30'} />
                      </div>
                    </div>

                    {/* Click hint for unavailable cards */}
                    {!role.available && (
                      <div className="mt-2 text-center">
                        <p className="text-white/40 text-xs">
                          Click to learn more
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Back of Card (Coming Soon Description) */}
                <div className={`absolute inset-0 backface-hidden bg-gradient-to-br from-orange-500/20 to-orange-600/20 backdrop-blur-xl border border-orange-500/30 rounded-2xl p-6 rotate-y-180 overflow-hidden`}>
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    {/* Coming Soon Badge */}
                    <motion.div
                      className="bg-gradient-to-r from-orange-400 to-orange-500 text-black px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-lg mb-4"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.1 }}
                    >
                      <Lock size={14} />
                      Coming Soon
                    </motion.div>

                    {/* Description */}
                    <div className="space-y-3 flex-1 flex flex-col justify-center">
                      <h3 className="text-xl font-bold text-white">
                        {role.title} Tools
                      </h3>
                      <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                        <p className="text-orange-300 text-sm leading-relaxed">
                          We're building powerful tools for recruiters to review CVs from students and professionals, 
                          creating opportunities for extra income through candidate evaluation.
                        </p>
                      </div>
                      <p className="text-white/60 text-xs">
                        Click again to flip back
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
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
