'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Phone, Globe, MapPin, Plus, Trash2, Sparkles, RefreshCw } from 'lucide-react';
import RichTextEditor from '@/components/ui/RichTextEditor';
import WYSIWYGEditor, { WYSIWYGToolbar } from '@/components/ui/WYSIWYGEditor';
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
  
  const handleFieldChange = (field: string, value: any) => {
    // Handle top-level fields - pass field name without 'basics.' prefix
    // RestructuredStudioLayout will add the prefix
    const safeValue = typeof value === 'string' ? validateStringValue(value, field) : value;
    onUpdate(field, safeValue);
  };

  const handleNameChange = (value: string) => {
    handleFieldChange('name', value);
  };

  const handleLocationChange = (field: string, value: string) => {
    const safeValue = validateStringValue(value, field);
    const updatedLocation = {
      ...safePersonalInfo.location,
      [field]: safeValue
    };
    // Pass location object directly - RestructuredStudioLayout will handle the path
    onUpdate('location', updatedLocation);
  };

  const handleProfileChange = (index: number, field: string, value: string) => {
    const safeValue = validateStringValue(value, field);
    const updatedProfiles = [...safePersonalInfo.profiles];
    updatedProfiles[index] = {
      ...updatedProfiles[index],
      [field]: safeValue
    };
    onUpdate('profiles', updatedProfiles);
  };

  const addProfile = () => {
    const newProfile = {
      network: '',
      username: '',
      url: ''
    };
    onUpdate('basics.profiles', [...safePersonalInfo.profiles, newProfile]);
  };

  const removeProfile = (index: number) => {
    const updatedProfiles = safePersonalInfo.profiles.filter((_, i) => i !== index);
    onUpdate('profiles', updatedProfiles);
  };

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
          personalInfo: safePersonalInfo,
          type: 'professional_summary'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate summary');
      }

      const result = await response.json();
      handleFieldChange('summary', result.summary);
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
          onChange={(e) => handleFieldChange('label', e.target.value)}
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
          onChange={(e) => handleFieldChange('email', e.target.value)}
          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
          placeholder="john.doe@example.com"
        />
      </div>

      <div>
        <label className="block text-white/80 text-sm font-medium mb-2">Phone</label>
        <input
          type="tel"
          value={safePersonalInfo.phone}
          onChange={(e) => handleFieldChange('phone', e.target.value)}
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
          onChange={(e) => handleFieldChange('url', e.target.value)}
          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors"
          placeholder="https://yourportfolio.com"
        />
      </div>

      <div>
        <label className="block text-white/80 text-sm font-medium mb-2">Location</label>
        <input
          type="text"
          readOnly={false}
          disabled={false}
          value={(() => {
            const city = safePersonalInfo.location.city || '';
            const region = safePersonalInfo.location.region || '';
            return city && region ? `${city}, ${region}` : city || region || '';
          })()}
          onChange={(e) => {
            const inputValue = e.target.value;
            const parts = inputValue.split(', ').map(p => p.trim());
            handleLocationChange('city', parts[0] || '');
            handleLocationChange('region', parts[1] || '');
          }}
          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#80FF00] focus:bg-white/15 transition-colors cursor-text"
          placeholder="San Francisco, CA"
        />
      </div>

      {/* Professional Summary */}
      <div className="md:col-span-2">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-white/80 text-sm font-medium">Professional Summary</label>
          <WYSIWYGToolbar
            showAIButton={true}
            fieldType="summary"
            onAIGenerate={generateAISummary}
            isGenerating={isGeneratingSummary}
          />
        </div>
        <WYSIWYGEditor
          value={safePersonalInfo.summary}
          onChange={(value) => handleFieldChange('summary', value)}
          rows={4}
          placeholder="Write a brief summary of your professional background and key achievements..."
        />
      </div>

    </div>
  );
};

export default PersonalInfoForm; 