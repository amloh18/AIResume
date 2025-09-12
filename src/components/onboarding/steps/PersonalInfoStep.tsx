'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Globe, 
  Linkedin, 
  Github, 
  Check, 
  X,
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface PersonalInfoData {
  fullName: string;
  professionalTitle: string;
  email: string;
  phone: string;
  location: string;
  summary: string;
  website: string;
  linkedin: string;
  github: string;
}

interface PersonalInfoStepProps {
  data: PersonalInfoData;
  onNext: (data: Partial<PersonalInfoData>) => void;
  onPrevious: () => void;
  isFirstStep: boolean;
}

const PersonalInfoStep: React.FC<PersonalInfoStepProps> = ({
  data,
  onNext,
  onPrevious,
  isFirstStep
}) => {
  const [formData, setFormData] = useState<PersonalInfoData>(data);
  const [errors, setErrors] = useState<Partial<PersonalInfoData>>({});
  const [showAITooltip, setShowAITooltip] = useState(false);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateURL = (url: string): boolean => {
    if (!url) return true; // Optional field
    try {
      new URL(url.startsWith('http') ? url : `https://${url}`);
      return true;
    } catch {
      return false;
    }
  };

  const validateLinkedIn = (url: string): boolean => {
    if (!url) return true; // Optional field
    return url.includes('linkedin.com/in/') || url.includes('linkedin.com/company/');
  };

  const validateGitHub = (url: string): boolean => {
    if (!url) return true; // Optional field
    return url.includes('github.com/');
  };

  const handleInputChange = (field: keyof PersonalInfoData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<PersonalInfoData> = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    if (!formData.professionalTitle.trim()) {
      newErrors.professionalTitle = 'Professional title is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.location.trim()) {
      newErrors.location = 'Location is required';
    }

    if (formData.website && !validateURL(formData.website)) {
      newErrors.website = 'Please enter a valid website URL';
    }

    if (formData.linkedin && !validateLinkedIn(formData.linkedin)) {
      newErrors.linkedin = 'Please enter a valid LinkedIn profile URL';
    }

    if (formData.github && !validateGitHub(formData.github)) {
      newErrors.github = 'Please enter a valid GitHub profile URL';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateForm()) {
      onNext(formData);
    }
  };

  const handleAIClick = () => {
    // TODO: Implement AI assistance for summary
    console.log('AI assistance clicked');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-2xl"
    >
      {/* Header */}
      <div className="mb-8">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Step 1: Let's start with the basics.
        </h3>
        <p className="text-gray-600 dark:text-gray-300">
          This is the core contact information that will appear on all your CVs. 
          Ensure it's accurate and professional.
        </p>
      </div>

      {/* Form */}
      <div className="space-y-6">
        {/* Full Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Full Name *
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) => handleInputChange('fullName', e.target.value)}
              className={`w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-700 border rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                errors.fullName ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'
              }`}
              placeholder="Enter your full name"
            />
            {formData.fullName && !errors.fullName && (
              <Check className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-500" />
            )}
          </div>
          {errors.fullName && (
            <p className="text-red-500 text-sm mt-1">{errors.fullName}</p>
          )}
        </div>

        {/* Professional Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Professional Title *
          </label>
          <input
            type="text"
            value={formData.professionalTitle}
            onChange={(e) => handleInputChange('professionalTitle', e.target.value)}
            className={`w-full px-4 py-3 bg-white dark:bg-gray-700 border rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
              errors.professionalTitle ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'
            }`}
            placeholder="e.g., Software Engineer, Product Manager"
          />
          {errors.professionalTitle && (
            <p className="text-red-500 text-sm mt-1">{errors.professionalTitle}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Email Address *
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className={`w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-700 border rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                errors.email ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'
              }`}
              placeholder="your.email@example.com"
            />
            {formData.email && !errors.email && validateEmail(formData.email) && (
              <Check className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-500" />
            )}
            {formData.email && errors.email && (
              <X className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-red-500" />
            )}
          </div>
          {errors.email && (
            <p className="text-red-500 text-sm mt-1">{errors.email}</p>
          )}
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Phone Number
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="+1 (555) 123-4567"
            />
          </div>
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Location *
          </label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={formData.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
              className={`w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-700 border rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                errors.location ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'
              }`}
              placeholder="City, Country"
            />
            {formData.location && !errors.location && (
              <Check className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-500" />
            )}
          </div>
          {errors.location && (
            <p className="text-red-500 text-sm mt-1">{errors.location}</p>
          )}
        </div>

        {/* Summary */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Professional Summary
          </label>
          <div className="relative">
            <textarea
              value={formData.summary}
              onChange={(e) => handleInputChange('summary', e.target.value)}
              rows={4}
              className="w-full px-4 py-3 pr-12 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
              placeholder="Write a brief summary of your professional background and key strengths..."
            />
            <button
              onClick={handleAIClick}
              onMouseEnter={() => setShowAITooltip(true)}
              onMouseLeave={() => setShowAITooltip(false)}
              className="absolute top-3 right-3 p-1 text-blue-500 hover:text-blue-600 transition-colors"
              title="Stuck? Let our AI help you write a powerful summary."
            >
              <Sparkles className="h-4 w-4" />
            </button>
            
            {/* AI Tooltip */}
            {showAITooltip && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute top-12 right-3 bg-gray-900 text-white text-xs px-3 py-2 rounded-lg shadow-lg z-10 whitespace-nowrap"
              >
                Stuck? Let our AI help you write a powerful summary.
                <div className="absolute -top-1 right-4 w-2 h-2 bg-gray-900 rotate-45"></div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Links Section */}
        <div className="space-y-4">
          <h4 className="text-lg font-medium text-gray-900 dark:text-white">
            Professional Links
          </h4>
          
          {/* Website */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Website/Portfolio
            </label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="url"
                value={formData.website}
                onChange={(e) => handleInputChange('website', e.target.value)}
                className={`w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-700 border rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                  errors.website ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'
                }`}
                placeholder="https://yourwebsite.com"
              />
              {formData.website && !errors.website && validateURL(formData.website) && (
                <Check className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-500" />
              )}
              {formData.website && errors.website && (
                <X className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-red-500" />
              )}
            </div>
            {errors.website && (
              <p className="text-red-500 text-sm mt-1">{errors.website}</p>
            )}
          </div>

          {/* LinkedIn */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              LinkedIn Profile
            </label>
            <div className="relative">
              <Linkedin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="url"
                value={formData.linkedin}
                onChange={(e) => handleInputChange('linkedin', e.target.value)}
                className={`w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-700 border rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                  errors.linkedin ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'
                }`}
                placeholder="https://linkedin.com/in/yourprofile"
              />
              {formData.linkedin && !errors.linkedin && validateLinkedIn(formData.linkedin) && (
                <Check className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-500" />
              )}
              {formData.linkedin && errors.linkedin && (
                <X className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-red-500" />
              )}
            </div>
            {errors.linkedin && (
              <p className="text-red-500 text-sm mt-1">{errors.linkedin}</p>
            )}
          </div>

          {/* GitHub */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              GitHub Profile
            </label>
            <div className="relative">
              <Github className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="url"
                value={formData.github}
                onChange={(e) => handleInputChange('github', e.target.value)}
                className={`w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-700 border rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                  errors.github ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'
                }`}
                placeholder="https://github.com/yourusername"
              />
              {formData.github && !errors.github && validateGitHub(formData.github) && (
                <Check className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-500" />
              )}
              {formData.github && errors.github && (
                <X className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-red-500" />
              )}
            </div>
            {errors.github && (
              <p className="text-red-500 text-sm mt-1">{errors.github}</p>
            )}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-end mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
        <motion.button
          onClick={handleNext}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium rounded-lg transition-all shadow-lg hover:shadow-xl"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Next Step
          <ArrowRight className="h-4 w-4" />
        </motion.button>
      </div>
    </motion.div>
  );
};

export default PersonalInfoStep;
