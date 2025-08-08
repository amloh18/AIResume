'use client';

import React from 'react';
import { PersonalInfo } from '@/lib/stores/cvStore';
import RichTextEditor from '@/components/ui/RichTextEditor';

interface PersonalInfoFormProps {
  personalInfo: PersonalInfo;
  onUpdate: (field: keyof PersonalInfo, value: any) => void;
}

const PersonalInfoForm: React.FC<PersonalInfoFormProps> = ({
  personalInfo,
  onUpdate
}) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h2>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              First Name *
            </label>
            <input
              type="text"
              value={personalInfo.firstName}
              onChange={(e) => onUpdate('firstName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="John"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Last Name *
            </label>
            <input
              type="text"
              value={personalInfo.lastName}
              onChange={(e) => onUpdate('lastName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Doe"
            />
          </div>
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
          Location
        </label>
        <input
          type="text"
          value={personalInfo.location}
          onChange={(e) => onUpdate('location', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="San Francisco, CA"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Website
        </label>
        <input
          type="url"
          value={personalInfo.website}
          onChange={(e) => onUpdate('website', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="https://johndoe.com"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          LinkedIn
        </label>
        <input
          type="url"
          value={personalInfo.linkedin}
          onChange={(e) => onUpdate('linkedin', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="https://linkedin.com/in/johndoe"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          GitHub
        </label>
        <input
          type="url"
          value={personalInfo.github}
          onChange={(e) => onUpdate('github', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="https://github.com/johndoe"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Professional Summary
        </label>
        <div className="border border-gray-300 rounded-md">
          <RichTextEditor
            content={personalInfo.summary}
            onChange={(content) => onUpdate('summary', content)}
            placeholder="Write a compelling professional summary..."
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Write a brief summary of your professional background and career objectives.
        </p>
      </div>
    </div>
  );
};

export default PersonalInfoForm; 