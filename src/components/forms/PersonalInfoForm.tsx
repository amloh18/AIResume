'use client';

import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Phone, Globe, MapPin, Plus, Trash2, Sparkles, RefreshCw, Upload, X, Image as ImageIcon } from 'lucide-react';
import { useSession } from 'next-auth/react';
import RichTextEditor from '@/components/ui/RichTextEditor';
import WYSIWYGEditor, { WYSIWYGToolbar } from '@/components/ui/WYSIWYGEditor';
import { AISuggestionsPanel } from '@/components/ai/AISuggestionsPanel';
import { validateStringValue } from '@/lib/utils/eventHandlers';
import { uploadToS3 } from '@/lib/utils/upload';
import InlineSuggestion from '@/components/resume-enhancer/annotations/InlineSuggestion';
import type { FixAnnotation } from '@/components/resume-enhancer/annotations/fix-annotation';

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
  annotations?: FixAnnotation[];
  onApplyAnnotation?: (fix: FixAnnotation) => void;
  onDismissAnnotation?: (fixId: string) => void;
  reviewMode?: boolean;
}

const PersonalInfoForm: React.FC<PersonalInfoFormProps> = ({
  data,
  onUpdate,
  cvData,
  jobData,
  userId,
  annotations = [],
  onApplyAnnotation,
  onDismissAnnotation,
  reviewMode = false
}) => {
  // Get session for authentication - use this as primary source, with userId as fallback
  const { data: session, status: sessionStatus } = useSession();
  const currentUserId = userId || session?.user?.id;
  const isAuthenticated = sessionStatus === 'authenticated' && !!session?.user;

  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<{ method: string; content: string }>>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Debug logging to understand data structure
  console.log('🔍 PersonalInfoForm - data:', data);
  console.log('🔍 PersonalInfoForm - cvData:', cvData);

  // Get user's profile photo from session as fallback
  const userProfilePhoto = session?.user?.image || '';

  // Ensure we have proper data structure
  // Use user profile photo as fallback if no CV image
  const safePersonalInfo = {
    name: data?.name || cvData?.basics?.name || '',
    label: data?.label || cvData?.basics?.label || '',
    image: data?.image || cvData?.basics?.image || userProfilePhoto || '',
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

  const generateAISuggestions = async () => {
    if (!userId) return;

    setLoadingSuggestions(true);
    setShowSuggestions(true);

    try {
      const response = await fetch('/api/ai/generate-suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          jobData,
          sectionData: safePersonalInfo,
          sectionType: 'summary',
          currentText: safePersonalInfo.summary || '',
          cvData
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate suggestions');
      }

      const result = await response.json();
      setSuggestions(result.suggestions);
    } catch (error) {
      console.error('Error generating AI suggestions:', error);
      setShowSuggestions(false);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleSelectSuggestion = (content: string) => {
    handleFieldChange('summary', content);
    setShowSuggestions(false);
  };

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setUploadError('Please upload an image file');
      return;
    }

    // Check file size (5MB limit for images)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image size must be less than 5MB');
      return;
    }

    // Check if user is authenticated (required for upload)
    // Use isAuthenticated from session rather than userId prop
    if (!isAuthenticated) {
      setUploadError('Please sign in to upload photos');
      return;
    }

    setIsUploadingImage(true);
    setUploadError(null);

    try {
      const result = await uploadToS3({
        file,
        uploadType: 'profile-picture',
        onProgress: (progress) => {
          console.log('Upload progress:', progress);
        }
      });

      if (result.success && result.publicUrl) {
        handleFieldChange('image', result.publicUrl);
        setUploadError(null);
      } else {
        const errorMsg = result.error || 'Failed to upload image';
        console.error('Upload failed:', errorMsg);
        setUploadError(errorMsg);
      }
    } catch (error) {
      console.error('Image upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload image';

      // Provide more specific error messages
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
        setUploadError('Network error. Please check your internet connection and try again.');
      } else if (errorMessage.includes('Unauthorized') || errorMessage.includes('401')) {
        setUploadError('Please sign in to upload photos');
      } else {
        setUploadError(errorMessage);
      }
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = () => {
    handleFieldChange('image', '');
    setUploadError(null);
  };

  return (
    <div className="grid grid-cols-1 tablet:grid-cols-2 gap-6">
      {/* Photo Upload Section - Full Width */}
      <div className="tablet:col-span-2">
        <label className="block text-white/80 text-sm font-medium mb-2">Profile Photo</label>
        <div className="flex items-start gap-4">
          {/* Image Preview */}
          {safePersonalInfo.image ? (
            <div className="relative flex-shrink-0">
              <img
                src={safePersonalInfo.image}
                alt="Profile"
                className="w-24 h-24 rounded-lg object-cover border-2 border-[var(--border-primary)]"
                onError={(e) => {
                  // Handle broken image URLs
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 shadow-lg transition-colors"
                title="Remove photo"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className="w-24 h-24 rounded-lg border-2 border-dashed border-[var(--border-primary)] flex items-center justify-center bg-[var(--bg-tertiary)] flex-shrink-0">
              <ImageIcon className="w-8 h-8 text-[color:var(--text-tertiary)]" />
            </div>
          )}

          {/* Upload Controls */}
          <div className="flex-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              id="photo-upload"
              disabled={isUploadingImage}
            />
            <label
              htmlFor="photo-upload"
              className={`inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-lg text-[color:var(--text-primary)] cursor-pointer hover:bg-[var(--hover-bg)] transition-colors ${isUploadingImage ? 'opacity-50 cursor-not-allowed' : ''
                }`}
            >
              {isUploadingImage ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>{safePersonalInfo.image ? 'Change Photo' : 'Upload Photo'}</span>
                </>
              )}
            </label>
            {uploadError && (
              <p className="mt-2 text-sm text-red-400">{uploadError}</p>
            )}
            <p className="mt-2 text-xs text-[color:var(--text-tertiary)]">
              Recommended: Square image, max 5MB. Formats: JPG, PNG, WEBP
            </p>
          </div>
        </div>
      </div>

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
      <div className="tablet:col-span-2">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-white/80 text-sm font-medium">Professional Summary</label>
          <WYSIWYGToolbar
            showAIButton={true}
            fieldType="summary"
            onAISuggestions={generateAISuggestions}
            isGenerating={loadingSuggestions}
          />
        </div>
        <AISuggestionsPanel
          isVisible={showSuggestions}
          suggestions={suggestions}
          isLoading={loadingSuggestions}
          onSelect={handleSelectSuggestion}
          onClose={() => setShowSuggestions(false)}
        />
        <WYSIWYGEditor
          value={safePersonalInfo.summary}
          onChange={(value) => handleFieldChange('summary', value)}
          rows={4}
          placeholder="Write a brief summary of your professional background and key achievements..."
          hasAnnotation={reviewMode && annotations.some((ann) => ann.fieldPath === 'basics.summary' && ann.status === 'open')}
        />
        {/* Display inline suggestions for basics.summary below the editor - only when review mode is ON */}
        {reviewMode && annotations
          .filter((ann) => ann.fieldPath === 'basics.summary' && ann.status === 'open')
          .map((fix) => (
            <InlineSuggestion
              key={fix.id}
              fix={fix}
              onApply={onApplyAnnotation || (() => { })}
              onDismiss={onDismissAnnotation || (() => { })}
            />
          ))}
      </div>

    </div>
  );
};

export default PersonalInfoForm; 