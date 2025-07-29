'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, GraduationCap, Briefcase, Building, ArrowRight, CheckCircle, Eye, EyeOff } from 'lucide-react';

interface RegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegister: (userData: any) => void;
  cvData?: any;
}

const RegistrationModal: React.FC<RegistrationModalProps> = ({ isOpen, onClose, onRegister, cvData }) => {
  const [step, setStep] = useState<'role' | 'details' | 'complete'>('role');
  const [selectedRole, setSelectedRole] = useState<'student' | 'professional' | 'recruiter' | null>(null);
  const [formData, setFormData] = useState({
    firstName: cvData?.personalInfo?.firstName || '',
    lastName: cvData?.personalInfo?.lastName || '',
    email: cvData?.personalInfo?.email || '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<any>({});

  const roles = [
    {
      id: 'student',
      title: 'Student',
      description: 'I\'m a student looking to build my professional profile',
      icon: GraduationCap,
      color: 'from-blue-400 to-blue-600',
      features: ['Free CV templates', 'Student discounts', 'Career guidance']
    },
    {
      id: 'professional',
      title: 'Professional',
      description: 'I\'m a working professional looking to advance my career',
      icon: Briefcase,
      color: 'from-green-400 to-green-600',
      features: ['Advanced templates', 'Premium features', 'Priority support']
    },
    {
      id: 'recruiter',
      title: 'Recruiter',
      description: 'I\'m a recruiter looking to find and manage talent',
      icon: Building,
      color: 'from-purple-400 to-purple-600',
      features: ['Talent search', 'Candidate management', 'Analytics dashboard']
    }
  ];

  const validateForm = () => {
    const newErrors: any = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain uppercase, lowercase, and number';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.agreeToTerms) {
      newErrors.agreeToTerms = 'You must agree to the terms and conditions';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRoleSelect = (role: 'student' | 'professional' | 'recruiter') => {
    setSelectedRole(role);
    setStep('details');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      setStep('complete');
      
      // Simulate registration process
      setTimeout(() => {
        onRegister({
          ...formData,
          role: selectedRole,
          cvData
        });
      }, 2000);
    }
  };

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="relative w-full max-w-4xl mx-4 bg-gradient-to-br from-gray-900/95 to-black/95 rounded-3xl border border-white/10 shadow-2xl overflow-hidden"
          initial={{ scale: 0.8, y: 50 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.8, y: 50 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
        >
          {/* Header */}
          <div className="relative p-8 border-b border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">
                  {step === 'role' && 'Choose Your Role'}
                  {step === 'details' && 'Create Your Account'}
                  {step === 'complete' && 'Welcome to CVCircle!'}
                </h2>
                <p className="text-white/60 text-lg">
                  {step === 'role' && 'Tell us about yourself to personalize your experience'}
                  {step === 'details' && 'Complete your account setup to get started'}
                  {step === 'complete' && 'Your account has been created successfully'}
                </p>
              </div>
              <motion.button
                onClick={onClose}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors duration-300"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <X size={24} className="text-white" />
              </motion.button>
            </div>
          </div>

          {/* Content */}
          <div className="p-8">
            <AnimatePresence mode="wait">
              {step === 'role' && (
                <motion.div
                  key="role-selection"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {roles.map((role) => (
                      <motion.div
                        key={role.id}
                        className="group cursor-pointer"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleRoleSelect(role.id as any)}
                      >
                        <div className="relative p-6 bg-white/5 border border-white/10 rounded-2xl hover:border-lime-400/50 transition-all duration-300">
                          <div className={`w-16 h-16 bg-gradient-to-br ${role.color} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                            <role.icon size={32} className="text-white" />
                          </div>
                          
                          <h3 className="text-xl font-bold text-white mb-2">{role.title}</h3>
                          <p className="text-white/60 text-sm mb-4">{role.description}</p>
                          
                          <ul className="space-y-2">
                            {role.features.map((feature, index) => (
                              <li key={index} className="flex items-center gap-2 text-white/80 text-sm">
                                <CheckCircle size={16} className="text-lime-400" />
                                {feature}
                              </li>
                            ))}
                          </ul>
                          
                          <motion.div
                            className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                            whileHover={{ rotate: 45 }}
                          >
                            <ArrowRight size={20} className="text-lime-400" />
                          </motion.div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {step === 'details' && (
                <motion.div
                  key="registration-form"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  className="space-y-6"
                >
                  {/* Selected Role Display */}
                  <div className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-2xl">
                    {selectedRole && (
                      <>
                        <div className={`w-12 h-12 bg-gradient-to-br ${roles.find(r => r.id === selectedRole)?.color} rounded-xl flex items-center justify-center`}>
                          {React.createElement(roles.find(r => r.id === selectedRole)?.icon || User, { size: 24, className: "text-white" })}
                        </div>
                        <div>
                          <h4 className="text-white font-medium">{roles.find(r => r.id === selectedRole)?.title}</h4>
                          <p className="text-white/60 text-sm">{roles.find(r => r.id === selectedRole)?.description}</p>
                        </div>
                        <motion.button
                          onClick={() => setStep('role')}
                          className="ml-auto text-white/60 hover:text-white transition-colors"
                          whileHover={{ scale: 1.1 }}
                        >
                          Change
                        </motion.button>
                      </>
                    )}
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-white/80 text-sm font-medium mb-2">First Name</label>
                        <input
                          type="text"
                          value={formData.firstName}
                          onChange={(e) => updateFormData('firstName', e.target.value)}
                          className={`w-full px-4 py-3 bg-white/5 border rounded-xl text-white placeholder-white/40 focus:outline-none transition-colors ${
                            errors.firstName ? 'border-red-400' : 'border-white/10 focus:border-lime-400'
                          }`}
                          placeholder="Enter your first name"
                        />
                        {errors.firstName && (
                          <p className="text-red-400 text-sm mt-1">{errors.firstName}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-white/80 text-sm font-medium mb-2">Last Name</label>
                        <input
                          type="text"
                          value={formData.lastName}
                          onChange={(e) => updateFormData('lastName', e.target.value)}
                          className={`w-full px-4 py-3 bg-white/5 border rounded-xl text-white placeholder-white/40 focus:outline-none transition-colors ${
                            errors.lastName ? 'border-red-400' : 'border-white/10 focus:border-lime-400'
                          }`}
                          placeholder="Enter your last name"
                        />
                        {errors.lastName && (
                          <p className="text-red-400 text-sm mt-1">{errors.lastName}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-white/80 text-sm font-medium mb-2">Email Address</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => updateFormData('email', e.target.value)}
                        className={`w-full px-4 py-3 bg-white/5 border rounded-xl text-white placeholder-white/40 focus:outline-none transition-colors ${
                          errors.email ? 'border-red-400' : 'border-white/10 focus:border-lime-400'
                        }`}
                        placeholder="your.email@example.com"
                      />
                      {errors.email && (
                        <p className="text-red-400 text-sm mt-1">{errors.email}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-white/80 text-sm font-medium mb-2">Password</label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={formData.password}
                          onChange={(e) => updateFormData('password', e.target.value)}
                          className={`w-full px-4 py-3 bg-white/5 border rounded-xl text-white placeholder-white/40 focus:outline-none transition-colors pr-12 ${
                            errors.password ? 'border-red-400' : 'border-white/10 focus:border-lime-400'
                          }`}
                          placeholder="Create a strong password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white transition-colors"
                        >
                          {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                      </div>
                      {errors.password && (
                        <p className="text-red-400 text-sm mt-1">{errors.password}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-white/80 text-sm font-medium mb-2">Confirm Password</label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={formData.confirmPassword}
                          onChange={(e) => updateFormData('confirmPassword', e.target.value)}
                          className={`w-full px-4 py-3 bg-white/5 border rounded-xl text-white placeholder-white/40 focus:outline-none transition-colors pr-12 ${
                            errors.confirmPassword ? 'border-red-400' : 'border-white/10 focus:border-lime-400'
                          }`}
                          placeholder="Confirm your password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white transition-colors"
                        >
                          {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                      </div>
                      {errors.confirmPassword && (
                        <p className="text-red-400 text-sm mt-1">{errors.confirmPassword}</p>
                      )}
                    </div>

                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="agreeToTerms"
                        checked={formData.agreeToTerms}
                        onChange={(e) => updateFormData('agreeToTerms', e.target.checked)}
                        className="mt-1 w-4 h-4 text-lime-400 bg-white/5 border-white/10 rounded focus:ring-lime-400 focus:ring-2"
                      />
                      <label htmlFor="agreeToTerms" className="text-white/80 text-sm">
                        I agree to the{' '}
                        <a href="#" className="text-lime-400 hover:text-lime-300 underline">
                          Terms of Service
                        </a>{' '}
                        and{' '}
                        <a href="#" className="text-lime-400 hover:text-lime-300 underline">
                          Privacy Policy
                        </a>
                      </label>
                    </div>
                    {errors.agreeToTerms && (
                      <p className="text-red-400 text-sm">{errors.agreeToTerms}</p>
                    )}

                    <motion.button
                      type="submit"
                      className="w-full py-4 px-6 bg-gradient-to-r from-lime-400 to-lime-500 text-black font-semibold rounded-xl hover:from-lime-300 hover:to-lime-400 transition-all duration-300 shadow-2xl shadow-lime-400/25"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Create Account
                    </motion.button>
                  </form>
                </motion.div>
              )}

              {step === 'complete' && (
                <motion.div
                  key="completion"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  className="text-center space-y-6"
                >
                  <motion.div
                    className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-green-400 to-green-500 flex items-center justify-center"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", damping: 15, stiffness: 300 }}
                  >
                    <CheckCircle size={48} className="text-white" />
                  </motion.div>
                  
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-2">Welcome to CVCircle!</h3>
                    <p className="text-white/60 text-lg">
                      Your account has been created successfully. We're setting up your dashboard...
                    </p>
                  </div>

                  <div className="flex justify-center">
                    <div className="flex space-x-2">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="w-2 h-2 bg-lime-400 rounded-full"
                          animate={{ scale: [1, 1.5, 1] }}
                          transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default RegistrationModal; 