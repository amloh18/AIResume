'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import MasterCVOnboarding from '@/components/onboarding/MasterCVOnboarding';

interface MasterCVData {
  // Personal Information
  fullName: string;
  professionalTitle: string;
  email: string;
  phone: string;
  location: string;
  summary: string;
  website: string;
  linkedin: string;
  github: string;
  
  // Experience
  workExperience: Array<{
    id: string;
    jobTitle: string;
    company: string;
    location: string;
    startDate: string;
    endDate: string;
    isCurrent: boolean;
    description: string;
  }>;
  
  education: Array<{
    id: string;
    degree: string;
    institution: string;
    location: string;
    startDate: string;
    endDate: string;
    isCurrent: boolean;
    description: string;
  }>;
  
  projects: Array<{
    id: string;
    name: string;
    description: string;
    technologies: string;
    url: string;
    startDate: string;
    endDate: string;
  }>;
  
  // Skills & Achievements
  skills: string[];
  languages: Array<{
    id: string;
    language: string;
    proficiency: 'Native' | 'Fluent' | 'Conversational' | 'Basic';
  }>;
  achievements: string;
  interests: string[];
}

const MasterCVOnboardingPage: React.FC = () => {
  const router = useRouter();
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(true);

  const handleComplete = async (data: MasterCVData) => {
    try {
      console.log('🎉 Master CV Data:', data);
      
      // TODO: Save to database via API
      const response = await fetch('/api/cvs/create-master', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cvData: data,
          isMaster: true
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Master CV created:', result);
        
        // Redirect to dashboard
        router.push('/dashboard');
      } else {
        console.error('❌ Failed to create Master CV');
        // Handle error - maybe show a toast notification
      }
    } catch (error) {
      console.error('❌ Error creating Master CV:', error);
      // Handle error - maybe show a toast notification
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    // Redirect to dashboard or home page
    router.push('/dashboard');
  };

  // Redirect if not authenticated
  if (!session) {
    router.push('/auth/signin');
    return null;
  }

  return (
    <MasterCVOnboarding
      isOpen={isOpen}
      onClose={handleClose}
      onComplete={handleComplete}
    />
  );
};

export default MasterCVOnboardingPage;
