'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Phone, Globe, MapPin, Plus, Trash2, Sparkles, RefreshCw } from 'lucide-react';
import RichTextEditor from '@/components/ui/RichTextEditor';
import { getThemeClasses } from '@/lib/utils/themeUtils';
import { validateStringValue } from '@/lib/utils/eventHandlers';

interface PersonalInfoFormProps {
  data: {
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
  data,
  onUpdate,
  cvData,
  jobData,
  userId
}) => {
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  
  // Debug logging to understand data structure
  console.log('🔍 PersonalInfoForm - data:', data);
  console.log('🔍 PersonalInfoForm - cvData:', cvData);
  
  // Ensure we have proper data structure
  const safePersonalInfo = {
    name: data?.name || cvData?.basics?.name || '',
    label: data?.label || cvData?.basics?.label || '',
    image: data?.image || cvData?.basics?.image || '',
    email: data?.email || cvData?.basics?.email || '',
    phone: data?.phone || cvData?.basics?.phone || '',
    url: data?.url || cvData?.basics?.url || '',
    summary: data?.summary || cvData?.basics?.summary || '',
    location: {
      address: data?.location?.address || cvData?.basics?.location?.address || '',
      postalCode: data?.location?.postalCode || cvData?.basics?.location?.postalCode || '',
      city: data?.location?.city || cvData?.basics?.location?.city || '',
      countryCode: data?.location?.countryCode || cvData?.basics?.location?.countryCode || '',
      region: data?.location?.region || cvData?.basics?.location?.region || ''
    },
    profiles: data?.profiles || cvData?.basics?.profiles || []
  };
  
  const handleNameChange = (value: string) => {
    const safeValue = validateStringValue(value, 'name');
    onUpdate({ ...safePersonalInfo, name: safeValue });
  };

  const handleLocationChange = (field: string, value: string) => {
    const safeValue = validateStringValue(value, field);
    onUpdate({
      ...safePersonalInfo,
      location: {
        ...safePersonalInfo.location,
        [field]: safeValue
      }
    });
  };

  const handleProfileChange = (index: number, field: string, value: string) => {
    const safeValue = validateStringValue(value, field);
    const updatedProfiles = [...safePersonalInfo.profiles];
    updatedProfiles[index] = {
      ...updatedProfiles[index],
      [field]: safeValue
    };
    onUpdate({ ...safePersonalInfo, profiles: updatedProfiles });
  };

  const addProfile = () => {
    const newProfile = {
      network: '',
      username: '',
      url: ''
    };
    onUpdate({ ...safePersonalInfo, profiles: [...safePersonalInfo.profiles, newProfile] });
  };

  const removeProfile = (index: number) => {
    const updatedProfiles = safePersonalInfo.profiles.filter((_, i) => i !== index);
    onUpdate({ ...safePersonalInfo, profiles: updatedProfiles });
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
      onUpdate({ ...safePersonalInfo, summary: result.summary });
    } catch (error) {
      console.error('Error generating AI summary:', error);
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Name and Title */}
      <div>
        <label className="block text-white/80 text-sm font-medium mb-2">Full Name</label>
        <input
          type="text"
          value={safePersonalInfo.name}
          onChange={(e) => handleNameChange(e.target.value)}
          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
          placeholder="John Doe"
        />
      </div>

      <div>
        <label className="block text-white/80 text-sm font-medium mb-2">Professional Title</label>
        <input
          type="text"
          value={safePersonalInfo.label}
          onChange={(e) => {
            const value = e.target.value;
            onUpdate({ ...safePersonalInfo, label: value });
          }}
          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
          placeholder="Senior Product Manager"
        />
      </div>

      {/* Contact Information */}
      <div>
        <label className="block text-white/80 text-sm font-medium mb-2">Email</label>
        <input
          type="email"
          value={safePersonalInfo.email}
          onChange={(e) => {
            const value = e.target.value;
            onUpdate({ ...safePersonalInfo, email: value });
          }}
          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
          placeholder="john.doe@example.com"
        />
      </div>

      <div>
        <label className="block text-white/80 text-sm font-medium mb-2">Phone</label>
        <input
          type="tel"
          value={safePersonalInfo.phone}
          onChange={(e) => {
            const value = e.target.value;
            onUpdate({ ...safePersonalInfo, phone: value });
          }}
          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
          placeholder="+1 (555) 123-4567"
        />
      </div>

      {/* Website and Location */}
      <div>
        <label className="block text-white/80 text-sm font-medium mb-2">Website / Portfolio URL</label>
        <input
          type="url"
          value={safePersonalInfo.url}
          onChange={(e) => {
            const value = e.target.value;
            onUpdate({ ...safePersonalInfo, url: value });
          }}
          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
          placeholder="https://yourportfolio.com"
        />
      </div>

      <div>
        <label className="block text-white/80 text-sm font-medium mb-2">Location</label>
        <input
          type="text"
          value={`${safePersonalInfo.location.city}${safePersonalInfo.location.region ? ', ' + safePersonalInfo.location.region : ''}`}
          onChange={(e) => {
            const parts = e.target.value.split(', ');
            handleLocationChange('city', parts[0] || '');
            handleLocationChange('region', parts[1] || '');
          }}
          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
          placeholder="San Francisco, CA"
        />
      </div>

      {/* Professional Summary */}
      <div className="md:col-span-2">
        <label className="block text-white/80 text-sm font-medium mb-2">Summary</label>
        <textarea
          value={safePersonalInfo.summary}
          onChange={(e) => onUpdate({ ...safePersonalInfo, summary: e.target.value })}
          rows={4}
          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors resize-none"
          placeholder="A brief summary about your professional background..."
        />
      </div>

    </div>
  );
};

export default PersonalInfoForm; 