import { CVService } from '@/lib/services/cvService';
import { useRouter } from 'next/navigation';
import { transformStudioToDatabase } from '@/lib/utils/cvDataTransform';
import { CVDataStructure } from '@/types/cv';

export interface CreateCVOptions {
  userId: string;
  title?: string;
  jobId?: string;
  router?: any;
}

export const createCVAndNavigate = async (options: CreateCVOptions) => {
  const {
    userId,
    title = 'Untitled CV',
    jobId,
    router
  } = options;

  try {
    // Create default CV data structure in CVDataStructure format
    const defaultCVData: CVDataStructure = {
      basics: {
        name: '',
        label: '',
        image: '',
        email: '',
        phone: '',
        url: '',
        summary: '',
        location: {
          address: '',
          postalCode: '',
          city: '',
          countryCode: '',
          region: ''
        },
        profiles: []
      },
      work: [],
      volunteer: [],
      education: [],
      awards: [],
      certificates: [],
      publications: [],
      skills: [],
      languages: [],
      interests: [],
      references: [],
      projects: []
    };

    // Create the CV in the database
    console.log('🚀 Creating CV with data:', { userId, title, jobId, hasData: !!defaultCVData });
    
    const newCV = await CVService.createCV({
      ...defaultCVData,
      userId,
      title,
      jobId
    });

    console.log('✅ CV creation response:', newCV);

    // Extract the CV ID from the response
    const cvId = newCV.data?.cv?.id || newCV.data?.cv?._id || newCV.id || newCV._id;
    console.log('🔍 Extracted CV ID:', cvId);

    // Log the activity (lazy import to avoid client-side issues)
    try {
      const { ActivityService } = await import('@/lib/services/activityService');
      await ActivityService.logCVCreated(userId, cvId, title);
    } catch (activityError) {
      console.error('Failed to log CV creation activity:', activityError);
    }

    // Navigate to the Studio with the new CV ID
    const studioUrl = `/studio?cvId=${cvId}${jobId ? `&jobId=${jobId}` : ''}`;
    
    if (router) {
      router.push(studioUrl);
    } else {
      window.location.href = studioUrl;
    }

    return newCV;
  } catch (error) {
    console.error('Error creating CV:', error);
    throw error;
  }
};

// Hook for use in components
export const useCreateCV = () => {
  const router = useRouter();

  const createCV = async (options: Omit<CreateCVOptions, 'router'>) => {
    return await createCVAndNavigate({
      ...options,
      router
    });
  };

  return { createCV };
};
