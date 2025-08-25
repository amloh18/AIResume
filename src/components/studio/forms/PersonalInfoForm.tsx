'use client';

import React from 'react';
import RichTextEditor from '@/components/ui/RichTextEditor';

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
}

const PersonalInfoForm: React.FC<PersonalInfoFormProps> = ({
  personalInfo,
  onUpdate
}) => {
  const handleNameChange = (value: string) => {
    onUpdate('name', value);
  };

  const handleLocationChange = (field: string, value: string) => {
    onUpdate('location', {
      ...personalInfo.location,
      [field]: value
    });
  };

  const handleProfileChange = (index: number, field: string, value: string) => {
    const updatedProfiles = [...personalInfo.profiles];
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
    onUpdate('profiles', [...personalInfo.profiles, newProfile]);
  };

  const removeProfile = (index: number) => {
    const updatedProfiles = personalInfo.profiles.filter((_, i) => i !== index);
    onUpdate('profiles', updatedProfiles);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h2>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Full Name *
          </label>
          <input
            type="text"
            value={personalInfo.name}
            onChange={(e) => handleNameChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="John Doe"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Professional Title
          </label>
          <input
            type="text"
            value={personalInfo.label}
            onChange={(e) => onUpdate('label', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Software Engineer"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Email *
        </label>
        <input
          type="email"
          value={personalInfo.email}
          onChange={(e) => onUpdate('email', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="john.doe@example.com"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Phone
        </label>
        <input
          type="tel"
          value={personalInfo.phone}
          onChange={(e) => onUpdate('phone', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="+1 (555) 123-4567"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Website
        </label>
        <input
          type="url"
          value={personalInfo.url}
          onChange={(e) => onUpdate('url', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="https://johndoe.com"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Location
        </label>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="text"
            value={personalInfo.location.city}
            onChange={(e) => handleLocationChange('city', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="City"
          />
          <input
            type="text"
            value={personalInfo.location.region}
            onChange={(e) => handleLocationChange('region', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="State/Region"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Professional Summary
        </label>
        <RichTextEditor
          value={personalInfo.summary}
          onChange={(value) => onUpdate('summary', value)}
          placeholder="Write a brief professional summary..."
        />
      </div>

      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Social Profiles
          </label>
          <button
            type="button"
            onClick={addProfile}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            + Add Profile
          </button>
        </div>
        
        {personalInfo.profiles.map((profile, index) => (
          <div key={index} className="border border-gray-200 rounded-md p-3 mb-2">
            <div className="grid grid-cols-3 gap-2 mb-2">
              <input
                type="text"
                value={profile.network}
                onChange={(e) => handleProfileChange(index, 'network', e.target.value)}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                placeholder="Network (e.g., LinkedIn)"
              />
              <input
                type="text"
                value={profile.username}
                onChange={(e) => handleProfileChange(index, 'username', e.target.value)}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                placeholder="Username"
              />
              <input
                type="url"
                value={profile.url}
                onChange={(e) => handleProfileChange(index, 'url', e.target.value)}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                placeholder="URL"
              />
            </div>
            <button
              type="button"
              onClick={() => removeProfile(index)}
              className="text-sm text-red-600 hover:text-red-700"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PersonalInfoForm; 