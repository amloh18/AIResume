'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Phone, Globe, MapPin, Plus, Trash2, Sparkles, RefreshCw } from 'lucide-react';
import RichTextEditor from '@/components/ui/RichTextEditor';
import { getThemeClasses } from '@/lib/utils/themeUtils';

interface PersonalInfoFormProps {
  personalInfo: {
    name: string;
    label: string;
    image: string;
    email: string;
    phone: string;
    url: string;
    summary: string;
    location: {
      address: string;
      postalCode: string;
      city: string;
      countryCode: string;
      region: string;
    };
    profiles: Array<{
      network: string;
      username: string;
      url: string;
    }>;
  };
  onUpdate: (field: string, value: any) => void;
  cvData?: any;
  jobData?: any;
  userId?: string;
}

const PersonalInfoForm: React.FC<PersonalInfoFormProps> = ({
  personalInfo,
  onUpdate,
  cvData,
  jobData,
  userId
}) => {
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  
  // Debug logging to understand data structure
  console.log('🔍 PersonalInfoForm - personalInfo:', personalInfo);
  console.log('🔍 PersonalInfoForm - cvData:', cvData);
  
  // Ensure we have proper data structure
  const safePersonalInfo = {
    name: personalInfo?.name || cvData?.basics?.name || '',
    label: personalInfo?.label || cvData?.basics?.label || '',
    image: personalInfo?.image || cvData?.basics?.image || '',
    email: personalInfo?.email || cvData?.basics?.email || '',
    phone: personalInfo?.phone || cvData?.basics?.phone || '',
    url: personalInfo?.url || cvData?.basics?.url || '',
    summary: personalInfo?.summary || cvData?.basics?.summary || '',
    location: {
      address: personalInfo?.location?.address || cvData?.basics?.location?.address || '',
      postalCode: personalInfo?.location?.postalCode || cvData?.basics?.location?.postalCode || '',
      city: personalInfo?.location?.city || cvData?.basics?.location?.city || '',
      countryCode: personalInfo?.location?.countryCode || cvData?.basics?.location?.countryCode || '',
      region: personalInfo?.location?.region || cvData?.basics?.location?.region || ''
    },
    profiles: personalInfo?.profiles || cvData?.basics?.profiles || []
  };
  
  const handleNameChange = (value: string) => {
    onUpdate('name', value);
  };

  const handleLocationChange = (field: string, value: string) => {
    onUpdate('location', {
      ...safePersonalInfo.location,
      [field]: value
    });
  };

  const handleProfileChange = (index: number, field: string, value: string) => {
    const updatedProfiles = [...safePersonalInfo.profiles];
    updatedProfiles[index] = {
      ...updatedProfiles[index],
      [field]: value
    };
    onUpdate('profiles', updatedProfiles);
  };

  const addProfile = () => {
    const newProfile = {
      network: '',
      username: '',
      url: ''
    };
    onUpdate('profiles', [...safePersonalInfo.profiles, newProfile]);
  };

  const removeProfile = (index: number) => {
    const updatedProfiles = safePersonalInfo.profiles.filter((_, i) => i !== index);
    onUpdate('profiles', updatedProfiles);
  };

  const themeClasses = getThemeClasses;

  const generateAISummary = async () => {
    if (!userId) return;
    
    setIsGeneratingSummary(true);
    try {
      const response = await fetch('/api/ai/generate-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          cvData,
          jobData,
          personalInfo,
          type: 'professional_summary'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate summary');
      }

      const result = await response.json();
      onUpdate('summary', result.summary);
    } catch (error) {
      console.error('Error generating AI summary:', error);
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-lime-100 dark:bg-lime-900/20 rounded-lg">
          <User className="w-5 h-5 text-lime-600 dark:text-lime-400" />
        </div>
        <h2 className={`text-lg font-semibold ${themeClasses.text.primary}`}>
          Personal Information
        </h2>
      </div>
      
      {/* Name and Title - Compact Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={`block text-sm font-medium ${themeClasses.text.secondary} mb-2`}>
            Full Name *
          </label>
          <input
            type="text"
            value={safePersonalInfo.name}
            onChange={(e) => handleNameChange(e.target.value)}
            className={`w-full px-3 py-2 rounded-lg border ${themeClasses.input.base} ${themeClasses.input.focus} transition-colors`}
            placeholder="John Doe"
          />
        </div>

        <div>
          <label className={`block text-sm font-medium ${themeClasses.text.secondary} mb-2`}>
            Professional Title
          </label>
          <input
            type="text"
            value={safePersonalInfo.label}
            onChange={(e) => onUpdate('label', e.target.value)}
            className={`w-full px-3 py-2 rounded-lg border ${themeClasses.input.base} ${themeClasses.input.focus} transition-colors`}
            placeholder="Software Engineer"
          />
        </div>
      </div>

      {/* Contact Information - Compact Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={`flex items-center gap-2 text-sm font-medium ${themeClasses.text.secondary} mb-2`}>
            <Mail className="w-4 h-4" />
            Email *
          </label>
          <input
            type="email"
            value={safePersonalInfo.email}
            onChange={(e) => onUpdate('email', e.target.value)}
            className={`w-full px-3 py-2 rounded-lg border ${themeClasses.input.base} ${themeClasses.input.focus} transition-colors`}
            placeholder="john.doe@example.com"
          />
        </div>

        <div>
          <label className={`flex items-center gap-2 text-sm font-medium ${themeClasses.text.secondary} mb-2`}>
            <Phone className="w-4 h-4" />
            Phone
          </label>
          <input
            type="tel"
            value={safePersonalInfo.phone}
            onChange={(e) => onUpdate('phone', e.target.value)}
            className={`w-full px-3 py-2 rounded-lg border ${themeClasses.input.base} ${themeClasses.input.focus} transition-colors`}
            placeholder="+1 (555) 123-4567"
          />
        </div>
      </div>

      {/* Website and Location - Compact Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={`flex items-center gap-2 text-sm font-medium ${themeClasses.text.secondary} mb-2`}>
            <Globe className="w-4 h-4" />
            Website
          </label>
          <input
            type="url"
            value={safePersonalInfo.url}
            onChange={(e) => onUpdate('url', e.target.value)}
            className={`w-full px-3 py-2 rounded-lg border ${themeClasses.input.base} ${themeClasses.input.focus} transition-colors`}
            placeholder="https://johndoe.com"
          />
        </div>

        <div>
          <label className={`flex items-center gap-2 text-sm font-medium ${themeClasses.text.secondary} mb-2`}>
            <MapPin className="w-4 h-4" />
            Location
          </label>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={safePersonalInfo.location.city}
              onChange={(e) => handleLocationChange('city', e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border ${themeClasses.input.base} ${themeClasses.input.focus} transition-colors`}
              placeholder="City"
            />
            <input
              type="text"
              value={safePersonalInfo.location.region}
              onChange={(e) => handleLocationChange('region', e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border ${themeClasses.input.base} ${themeClasses.input.focus} transition-colors`}
              placeholder="State/Region"
            />
          </div>
        </div>
      </div>

      {/* Professional Summary */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className={`block text-sm font-medium ${themeClasses.text.secondary}`}>
            Professional Summary
          </label>
          <motion.button
            onClick={generateAISummary}
            disabled={isGeneratingSummary || !safePersonalInfo.name || !safePersonalInfo.label}
            className="flex items-center gap-2 px-3 py-1.5 text-xs bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isGeneratingSummary ? (
              <RefreshCw className="w-3 h-3 animate-spin" />
            ) : (
              <Sparkles className="w-3 h-3" />
            )}
            <span>{isGeneratingSummary ? 'Generating...' : 'AI Generate'}</span>
          </motion.button>
        </div>
        <RichTextEditor
          value={safePersonalInfo.summary}
          onChange={(value) => onUpdate('summary', value)}
          placeholder=""
        />
      </div>

      {/* Social Profiles - Collapsible */}
      <div className={`${themeClasses.card.base} rounded-lg p-4`}>
        <div className="flex justify-between items-center mb-4">
          <label className={`text-sm font-medium ${themeClasses.text.secondary}`}>
            Social Profiles
          </label>
          <motion.button
            type="button"
            onClick={addProfile}
            className={`flex items-center gap-2 px-3 py-1.5 text-sm ${themeClasses.button.primary} rounded-lg transition-colors`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Plus className="w-4 h-4" />
            Add Profile
          </motion.button>
        </div>
        
        <div className="space-y-3">
          {safePersonalInfo.profiles.map((profile, index) => (
            <motion.div 
              key={index} 
              className={`${themeClasses.card.base} border rounded-lg p-3`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="grid grid-cols-3 gap-3 mb-3">
                <input
                  type="text"
                  value={profile.network}
                  onChange={(e) => handleProfileChange(index, 'network', e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border ${themeClasses.input.base} ${themeClasses.input.focus} transition-colors text-sm`}
                  placeholder="Network (e.g., LinkedIn)"
                />
                <input
                  type="text"
                  value={profile.username}
                  onChange={(e) => handleProfileChange(index, 'username', e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border ${themeClasses.input.base} ${themeClasses.input.focus} transition-colors text-sm`}
                  placeholder="Username"
                />
                <input
                  type="url"
                  value={profile.url}
                  onChange={(e) => handleProfileChange(index, 'url', e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border ${themeClasses.input.base} ${themeClasses.input.focus} transition-colors text-sm`}
                  placeholder="URL"
                />
              </div>
              <motion.button
                type="button"
                onClick={() => removeProfile(index)}
                className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Trash2 className="w-4 h-4" />
                Remove
              </motion.button>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PersonalInfoForm; 