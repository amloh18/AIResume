import { UnifiedCVService } from '@/lib/services/unified-cv-service';
import { DEFAULT_UNIFIED_CV_DATA } from '@/types/unified-cv-schema';
import { useRouter } from 'next/navigation';
import { generateCVName } from '@/lib/utils/cvNamingUtils';

export interface CreateCVOptions {
  userId: string;
  title?: string;
  jobId?: string;
  router?: any;
}

export const createCVAndNavigate = async (options: CreateCVOptions) => {
  const {
    userId,
    title,
    jobId,
    router
  } = options;

  try {
    // Generate automatic title if not provided
    const cvTitle = title || generateCVName(DEFAULT_UNIFIED_CV_DATA);
    
    // Create the CV in the database using unified service
    console.log('🚀 Creating CV with unified service:', { userId, title: cvTitle, jobId });
    
    const newCV = await UnifiedCVService.createDefaultCV(cvTitle, userId, 'default-template-id');

    console.log('✅ CV creation response:', newCV);

    // Extract the CV ID from the response
    const cvId = newCV.id;
    console.log('🔍 Extracted CV ID:', cvId);

    // Log the activity (lazy import to avoid client-side issues)
    try {
      const { ActivityService } = await import('@/lib/services/activityService');
      await ActivityService.logCVCreated(userId, cvId, cvTitle);
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
