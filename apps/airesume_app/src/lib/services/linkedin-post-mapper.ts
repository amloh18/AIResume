import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';

/**
 * LinkedIn Post Content Structure
 */
export interface LinkedInPost {
  text: string;
  media?: Array<{
    status: 'READY' | 'PROCESSING' | 'FAILED';
    description?: {
      text: string;
    };
    media: string; // URL to media
  }>;
}

/**
 * LinkedIn Share Content Structure (for UGC Post API)
 */
export interface LinkedInShareContent {
  author: string; // URN like "urn:li:person:{id}"
  lifecycleState: 'PUBLISHED' | 'DRAFT';
  specificContent: {
    'com.linkedin.ugc.ShareContent': {
      shareCommentary: {
        text: string;
      };
      shareMediaCategory: 'NONE' | 'ARTICLE' | 'IMAGE';
    };
  };
  visibility: {
    'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' | 'CONNECTIONS' | 'PRIVATE';
  };
}

/**
 * Generate LinkedIn post content from CV data and enhanced sections
 */
export const generateLinkedInPost = (
  cvData: UnifiedCVDataStructure,
  enhancedSections?: any,
  options?: {
    includeExperience?: boolean;
    maxLength?: number;
    tone?: 'professional' | 'enthusiastic' | 'achievement-focused';
  }
): LinkedInPost => {
  const {
    includeExperience = true,
    maxLength = 3000, // LinkedIn's post limit
    tone = 'professional',
  } = options || {};

  const basics = cvData.basics;
  const about = enhancedSections?.about || cvData.basics.summary || '';
  const work = cvData.work || [];
  const skills = cvData.skills || [];

  // Build experience highlights (top 3)
  const experienceHighlights = includeExperience 
    ? work.slice(0, 3).map((w) => `• ${w.position} at ${w.name}`).join('\n')
    : '';

  // Build skills summary
  const topSkills = skills.slice(0, 5).map((s) => s.skills).flat().slice(0, 5);
  const skillsText = topSkills.length > 0 
    ? `\n\nKey Skills: ${topSkills.join(', ')}`
    : '';

  // Generate post based on tone
  let postText = '';
  
  switch (tone) {
    case 'enthusiastic':
      postText = `🚀 Excited to share my professional journey!

${about?.substring(0, 300) || 'Passionate about driving results and creating impact.'}...

${experienceHighlights ? 'Key Experience:\n' + experienceHighlights + '\n' : ''}
Let's connect and explore opportunities!
${basics.url || ''}${skillsText}`;
      break;

    case 'achievement-focused':
      postText = `💼 Professional Profile: ${basics.name}

${about?.substring(0, 250) || 'Results-driven professional with a track record of success.'}...

${experienceHighlights ? 'Recent Highlights:\n' + experienceHighlights + '\n' : ''}
Open to new opportunities and collaborations.
${basics.url || ''}${skillsText}`;
      break;

    case 'professional':
    default:
      postText = `${basics.name} - ${basics.label || 'Professional'}

${about?.substring(0, 300) || 'Experienced professional with expertise in multiple domains.'}...

${experienceHighlights ? 'Experience:\n' + experienceHighlights + '\n' : ''}
Let's connect: ${basics.url || ''}${skillsText}`;
      break;
  }

  // Ensure we don't exceed LinkedIn's character limit
  if (postText.length > maxLength) {
    postText = postText.substring(0, maxLength - 3) + '...';
  }

  return {
    text: postText,
  };
};

/**
 * Create LinkedIn UGC Post API payload
 */
export const createLinkedInUGCPayload = (
  linkedInId: string,
  post: LinkedInPost,
  visibility: 'PUBLIC' | 'CONNECTIONS' | 'PRIVATE' = 'PUBLIC'
): LinkedInShareContent => {
  return {
    author: `urn:li:person:${linkedInId}`,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: {
          text: post.text,
        },
        shareMediaCategory: 'NONE',
      },
    },
    visibility: {
      'com.linkedin.ugc.MemberNetworkVisibility': visibility,
    },
  };
};

/**
 * Validate LinkedIn post content
 */
export const validateLinkedInPost = (post: LinkedInPost): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!post.text || post.text.trim().length === 0) {
    errors.push('Post content cannot be empty');
  }

  if (post.text.length > 3000) {
    errors.push(`Post content exceeds LinkedIn's 3000 character limit (current: ${post.text.length})`);
  }

  // Check for potentially problematic content
  const spamIndicators = [
    /http:\/\/[^\s]+/gi, // Non-HTTPS URLs
    /buy now/i,
    /click here/i,
    /visit my website/i,
  ];

  spamIndicators.forEach((pattern) => {
    if (pattern.test(post.text)) {
      errors.push('Post content may contain spam-like elements');
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
};
