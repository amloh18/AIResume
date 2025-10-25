'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Hand, 
  ChevronDown, 
  Check,
  Sparkles,
  Search
} from 'lucide-react';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRoleSelected: (role: string) => void;
}

const WelcomeModal: React.FC<WelcomeModalProps> = ({
  isOpen,
  onClose,
  onRoleSelected
}) => {
  const [selectedRole, setSelectedRole] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isValidRole, setIsValidRole] = useState(false);

  // Common roles for suggestions
  const roleSuggestions = [
    'Software Engineer',
    'Product Manager',
    'Product Designer',
    'Product Analyst',
    'UX Designer',
    'UI Designer',
    'Digital Marketer',
    'Marketing Manager',
    'Data Scientist',
    'Data Analyst',
    'Project Manager',
    'Business Analyst',
    'Sales Manager',
    'Content Writer',
    'Graphic Designer',
    'DevOps Engineer',
    'Frontend Developer',
    'Backend Developer',
    'Full Stack Developer',
    'Mobile Developer',
    'QA Engineer',
    'System Administrator',
    'Network Engineer',
    'Cybersecurity Analyst',
    'Financial Analyst',
    'HR Manager',
    'Operations Manager',
    'Consultant',
    'Freelancer',
    'Entrepreneur'
  ];

  const filteredRoles = roleSuggestions.filter(role =>
    role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    setIsValidRole(selectedRole.trim().length > 0);
  }, [selectedRole]);

  const handleRoleSelect = (role: string) => {
    setSelectedRole(role);
    setSearchQuery(role);
    setIsDropdownOpen(false);
  };

  const handleGetStarted = () => {
    if (isValidRole) {
      onRoleSelected(selectedRole);
      onClose();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && filteredRoles.length > 0) {
      handleRoleSelect(filteredRoles[0]);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl w-full max-w-md shadow-2xl"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 pb-4">
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <Hand className="h-8 w-8 text-white" />
                </div>
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-2">
                Welcome to CVCircle!
              </h2>
              
              <p className="text-gray-600 dark:text-gray-300 text-center text-sm leading-relaxed">
                Let's begin by building your <strong>Master CV</strong>—a central hub for all your professional information. 
                First, tell us your primary role so we can tailor your journey.
              </p>
            </div>

            {/* Form */}
            <div className="px-6 pb-6">
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Your Primary Role
                </label>
                
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setIsDropdownOpen(true);
                        if (e.target.value !== selectedRole) {
                          setSelectedRole('');
                        }
                      }}
                      onFocus={() => setIsDropdownOpen(true)}
                      onKeyDown={handleKeyPress}
                      placeholder="e.g., Software Engineer, Digital Marketer, UX Designer"
                      className="w-full pl-10 pr-10 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                    <button
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <ChevronDown className={`h-4 w-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                  </div>

                  {/* Dropdown */}
                  <AnimatePresence>
                    {isDropdownOpen && (
                      <motion.div
                        className="absolute z-10 w-full mt-1 bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                      >
                        {filteredRoles.length > 0 ? (
                          filteredRoles.map((role, index) => (
                            <button
                              key={role}
                              onClick={() => handleRoleSelect(role)}
                              className={`w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors ${
                                index === 0 ? 'rounded-t-lg' : ''
                              } ${
                                index === filteredRoles.length - 1 ? 'rounded-b-lg' : ''
                              } ${
                                selectedRole === role ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-sm">{role}</span>
                                {selectedRole === role && (
                                  <Check className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                )}
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-3 text-gray-500 dark:text-gray-400 text-sm text-center">
                            No roles found
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  e.g., Software Engineer, Digital Marketer, UX Designer
                </p>
              </div>

              {/* CTA Button */}
              <motion.button
                onClick={handleGetStarted}
                disabled={!isValidRole}
                className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
                  isValidRole
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                }`}
                whileHover={isValidRole ? { scale: 1.02 } : {}}
                whileTap={isValidRole ? { scale: 0.98 } : {}}
              >
                <div className="flex items-center justify-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Let's Get Started
                </div>
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default WelcomeModal;
