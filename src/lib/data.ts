import { connectToDatabase } from './database';
import User from '@/models/User';
import CV from '@/models/CV';

// User Profile interface for public profiles
export interface UserProfile {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  banner?: string;
  jobTitle?: string;
  location?: string;
  professionalSummary?: string;
  isPublicProfile: boolean;
  allowMessage: boolean;
  allowVideoCall: boolean;
  experiences: Array<{
    id: string;
    jobTitle: string;
    company: string;
    startDate: string;
    endDate?: string;
    description: string;
    highlights: string[];
  }>;
  portfolioProjects: Array<{
    id: string;
    title: string;
    description: string;
    imageUrl?: string;
    projectUrl?: string;
    technologies: string[];
  }>;
  skills: Array<{
    name: string;
    level: string;
    category: string;
  }>;
  education: Array<{
    institution: string;
    degree: string;
    field: string;
    startDate: string;
    endDate?: string;
  }>;
  socialLinks: Array<{
    platform: string;
    url: string;
    username: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Fetches user profile data by username
 * This function handles the dynamic route data fetching for profile pages
 */
export async function getUserProfile(username: string): Promise<UserProfile | null> {
  try {
    await connectToDatabase();
    
    // First try to find user by username
    let user = await User.findOne({ 
      username: username.toLowerCase()
    }).select('firstName lastName avatar email username createdAt updatedAt');
    
    // If not found by username, try to find by email prefix (fallback for users without username)
    if (!user) {
      // Extract email prefix and try to find user
      const emailPrefix = username.toLowerCase();
      user = await User.findOne({ 
        email: { $regex: new RegExp(`^${emailPrefix}@`, 'i') }
      }).select('firstName lastName avatar email username createdAt updatedAt');
    }
    
    if (!user) {
      return null;
    }
    
    // Get user's CV data for profile information
    const cv = await CV.findOne({ userId: user._id, isMaster: true }).select('cvData');
    
    // Create a basic profile even if CV data doesn't exist
    const profile: UserProfile = {
      id: user._id.toString(),
      username: user.username || username, // Use provided username or user's username
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar || undefined,
      banner: undefined, // Can be added to User model later
      jobTitle: cv?.cvData?.basics?.label || 'Professional',
      location: cv?.cvData?.basics?.location ? 
        `${cv.cvData.basics.location.city}, ${cv.cvData.basics.location.region}` : 
        undefined,
      professionalSummary: cv?.cvData?.basics?.summary || `${user.firstName} ${user.lastName} is a professional with experience in their field.`,
      isPublicProfile: true, // Default to public, can be added to User model
      allowMessage: true, // Default to true, can be added to User model
      allowVideoCall: false, // Default to false, can be added to User model
      experiences: (cv?.cvData?.work || []).map((work: any, index: number) => ({
        id: `exp-${index}`,
        jobTitle: work.position,
        company: work.name,
        startDate: work.startDate,
        endDate: work.endDate,
        description: work.summary,
        highlights: work.highlights || []
      })),
      portfolioProjects: (cv?.cvData?.projects || []).map((project: any, index: number) => ({
        id: `proj-${index}`,
        title: project.name,
        description: project.description,
        imageUrl: undefined, // Can be added to project model later
        projectUrl: project.url,
        technologies: [] // Can be extracted from description or added as separate field
      })),
      skills: (cv?.cvData?.skills || []).map((skill: any, index: number) => ({
        name: skill.name,
        level: skill.level,
        category: 'Technical' // Default category, can be added to skill model
      })),
      education: (cv?.cvData?.education || []).map((edu: any, index: number) => ({
        institution: edu.institution,
        degree: edu.studyType,
        field: edu.area,
        startDate: edu.startDate,
        endDate: edu.endDate
      })),
      socialLinks: (cv?.cvData?.basics?.profiles || []).map((profile: any) => ({
        platform: profile.network,
        url: profile.url,
        username: profile.username
      })),
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString()
    };
    
    return profile;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
}
