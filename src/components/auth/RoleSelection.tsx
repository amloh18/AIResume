'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, Briefcase, Users, ArrowRight, ArrowLeft } from 'lucide-react';

interface RoleSelectionProps {
  onRoleSelect: (role: 'student' | 'professional' | 'recruiter') => void;
  onBack?: () => void;
  isOpen: boolean;
}

const RoleSelection: React.FC<RoleSelectionProps> = ({ onRoleSelect, onBack, isOpen }) => {
  const [selectedRole, setSelectedRole] = useState<'student' | 'professional' | 'recruiter' | null>(null);

  const roles = [
    {
      id: 'student' as const,
      title: 'Student',
      description: 'Looking for internships, entry-level positions, or academic opportunities',
      icon: GraduationCap,
      color: 'from-blue-400 to-blue-600',
      features: [
        'Academic project showcase',
        'Internship tracking',
        'Entry-level job matching',
        'Career guidance resources'
      ]
    },
    {
      id: 'professional' as const,
      title: 'Professional',
      description: 'Experienced professional seeking career advancement or new opportunities',
      icon: Briefcase,
      color: 'from-green-400 to-green-600',
      features: [
        'Advanced CV templates',
        'Career progression tracking',
        'Professional networking',
        'Industry insights'
      ]
    },
    {
      id: 'recruiter' as const,
      title: 'Recruiter',
      description: 'HR professional or recruiter looking to discover and connect with talent',
      icon: Users,
      color: 'from-purple-400 to-purple-600',
      features: [
        'Candidate discovery tools',
        'Application management',
        'Talent pipeline tracking',
        'Recruitment analytics'
      ]
    }
  ];

  const handleRoleSelect = (role: 'student' | 'professional' | 'recruiter') => {
    setSelectedRole(role);
  };

  const handleContinue = () => {
    if (selectedRole) {
      onRoleSelect(selectedRole);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal */}
          <motion.div
            className="relative w-full max-w-4xl bg-gradient-to-br from-gray-900 to-black border border-white/10 rounded-3xl p-8 shadow-2xl overflow-y-auto max-h-[90vh]"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {/* Header */}
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-white mb-2">Choose Your Role</h2>
              <p className="text-white/60 text-lg">
                Help us personalize your CVCircle experience
              </p>
            </div>

            {/* Role Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {roles.map((role) => (
                <motion.div
                  key={role.id}
                  className={`relative p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${
                    selectedRole === role.id
                      ? 'border-lime-400 bg-lime-400/10'
                      : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                  }`}
                  onClick={() => handleRoleSelect(role.id)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: role.id === 'student' ? 0.1 : role.id === 'professional' ? 0.2 : 0.3 }}
                >
                  {/* Selection Indicator */}
                  {selectedRole === role.id && (
                    <motion.div
                      className="absolute top-4 right-4 w-6 h-6 bg-lime-400 rounded-full flex items-center justify-center"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", damping: 15, stiffness: 300 }}
                    >
                      <motion.div
                        className="w-2 h-2 bg-black rounded-full"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.1 }}
                      />
                    </motion.div>
                  )}

                  {/* Icon */}
                  <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${role.color} flex items-center justify-center`}>
                    <role.icon size={32} className="text-white" />
                  </div>

                  {/* Content */}
                  <div className="text-center mb-4">
                    <h3 className="text-xl font-bold text-white mb-2">{role.title}</h3>
                    <p className="text-white/60 text-sm">{role.description}</p>
                  </div>

                  {/* Features */}
                  <div className="space-y-2">
                    {role.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2 text-white/40 text-sm">
                        <div className="w-1.5 h-1.5 bg-lime-400 rounded-full" />
                        {feature}
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between">
              {onBack && (
                <motion.button
                  onClick={onBack}
                  className="flex items-center gap-2 px-6 py-3 text-white/60 hover:text-white transition-colors"
                  whileHover={{ x: -5 }}
                >
                  <ArrowLeft size={16} />
                  Back
                </motion.button>
              )}

              <div className="flex-1" />

              <motion.button
                onClick={handleContinue}
                disabled={!selectedRole}
                className={`flex items-center gap-2 px-8 py-4 rounded-xl font-semibold transition-all duration-300 ${
                  selectedRole
                    ? 'bg-gradient-to-r from-lime-400 to-lime-500 text-black hover:from-lime-300 hover:to-lime-400 shadow-2xl shadow-lime-400/25'
                    : 'bg-white/10 text-white/40 cursor-not-allowed'
                }`}
                whileHover={selectedRole ? { scale: 1.05 } : {}}
                whileTap={selectedRole ? { scale: 0.95 } : {}}
              >
                Continue
                <ArrowRight size={16} />
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default RoleSelection;