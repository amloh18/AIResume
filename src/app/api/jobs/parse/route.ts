import { NextRequest, NextResponse } from 'next/server';
import { getJobParserService } from '@/lib/services/jobParserService';
import { authenticateRequest } from '@/lib/utils/auth-helpers-api';
import { verifySponsorship } from '@/lib/services/sponsorshipVerificationService';
import { checkJobLimit } from '@/lib/utils/subscription-helpers';
import { connectToDatabase } from '@/lib/database';
import User from '@/models/User';

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Job Parse API - Request received');
    
    const auth = await authenticateRequest(request);
    if (!auth) {
      console.error('❌ Job Parse API - Unauthorized');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const userId = auth.userId;
    console.log('✅ Job Parse API - Authenticated user:', userId);

    // Check credits/membership BEFORE parsing to save AI tokens
    await connectToDatabase();
    const user = await User.findById(userId);
    if (!user) {
      console.error('❌ Job Parse API - User not found');
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const planKey = user.currentPlanKey || 'free';
    
    // Check job limit (count-based, not credit-based)
    const jobLimitCheck = await checkJobLimit(
      userId.toString(),
      planKey,
      user.subscription
    );

    console.log('🔍 Job Parse API - Job limit check result:', {
      allowed: jobLimitCheck.allowed,
      message: jobLimitCheck.message,
      currentCount: jobLimitCheck.currentCount,
      limit: jobLimitCheck.limit,
      planKey
    });

    if (!jobLimitCheck.allowed) {
      console.log('❌ Job Parse API - Job limit check failed:', jobLimitCheck.message);
      return NextResponse.json(
        {
          error: jobLimitCheck.message || 'Job limit exceeded. Please upgrade to parse job descriptions.',
          requiresUpgrade: jobLimitCheck.upgradeRequired,
          currentCount: jobLimitCheck.currentCount,
          limit: jobLimitCheck.limit,
          gateType: 'hard'
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { text, url } = body;
    console.log('🔍 Job Parse API - Input:', { hasText: !!text, hasUrl: !!url, textLength: text?.length });

    if (!text && !url) {
      console.error('❌ Job Parse API - Missing input');
      return NextResponse.json(
        { error: 'Either text or url is required' },
        { status: 400 }
      );
    }

    const parserService = getJobParserService();
    let parsedData;

    try {
      console.log('🔍 Job Parse API - Starting parsing...');
      if (url) {
        // Try URL parsing first (uses puppeteer)
        try {
          console.log('🔍 Job Parse API - Attempting URL parsing:', url);
          parsedData = await parserService.parseJobFromUrl(url);
          console.log('✅ Job Parse API - URL parsing successful');
        } catch (error) {
          // Fallback to LLM parsing if URL fetch fails
          console.log('⚠️ Job Parse API - URL parsing failed, falling back to LLM:', error);
          parsedData = await parserService.parseJobDescription(url, true);
          console.log('✅ Job Parse API - LLM fallback parsing successful');
        }
      } else {
        // Use LLM to parse text
        console.log('🔍 Job Parse API - Parsing text with LLM, length:', text.length);
        parsedData = await parserService.parseJobDescription(text, false);
        console.log('✅ Job Parse API - Text parsing successful');
      }

      // Verify sponsorship based on company and location
      let sponsorship: 'yes' | 'no' | 'unknown' = 'unknown';
      if (parsedData.company && parsedData.location) {
        try {
          console.log('🔍 Job Parse API - Verifying sponsorship:', { company: parsedData.company, location: parsedData.location });
          const sponsorshipResult = await verifySponsorship(parsedData.company, parsedData.location);
          // If any country shows verified, set to 'yes', otherwise 'no'
          if (sponsorshipResult.results && sponsorshipResult.results.length > 0) {
            const hasVerified = sponsorshipResult.results.some(result => result.isVerified === true);
            sponsorship = hasVerified ? 'yes' : 'no';
            console.log('✅ Job Parse API - Sponsorship verified:', sponsorship);
          }
        } catch (sponsorshipError) {
          console.error('⚠️ Job Parse API - Error verifying sponsorship (non-fatal):', sponsorshipError);
          // Keep as 'unknown' if verification fails
        }
      }

      // Validate parsedData structure
      if (!parsedData) {
        throw new Error('Parser returned null or undefined data');
      }

      console.log('🔍 Job Parse API - Parsed data received:', {
        hasTitle: !!parsedData.title,
        hasCompany: !!parsedData.company,
        hasDescription: !!parsedData.description,
        hasRequirements: !!parsedData.requirements,
        hasBenefits: !!parsedData.benefits
      });

      // Build job description with requirements and benefits
      let jobDescription = parsedData.description || '';
      
      // Add requirements if available
      if (parsedData.requirements && Array.isArray(parsedData.requirements) && parsedData.requirements.length > 0) {
        const requirementsText = `\n\nRequirements:\n${parsedData.requirements.join('\n')}`;
        jobDescription += requirementsText;
      }
      
      // Add benefits if available
      if (parsedData.benefits && Array.isArray(parsedData.benefits) && parsedData.benefits.length > 0) {
        const benefitsText = `\n\nBenefits:\n${parsedData.benefits.join('\n')}`;
        jobDescription += benefitsText;
      }

      // Map to JobApplication format
      const jobData = {
        jobTitle: parsedData.title || '',
        company: parsedData.company || '',
        location: parsedData.location,
        jobUrl: url || parsedData.sourceUrl,
        jobDescription: jobDescription.trim(),
        jobDescriptionRaw: text || url, // Store original input
        salary: parsedData.salary ? {
          min: parsedData.salary.min,
          max: parsedData.salary.max,
          currency: parsedData.salary.currency || 'USD',
          period: (parsedData.salary.period === 'hourly' || parsedData.salary.period === 'monthly' || parsedData.salary.period === 'yearly')
            ? parsedData.salary.period
            : 'yearly'
        } : undefined,
        deadline: parsedData.applicationDeadline 
          ? (() => {
              try {
                const date = new Date(parsedData.applicationDeadline);
                return isNaN(date.getTime()) ? undefined : date;
              } catch {
                return undefined;
              }
            })()
          : undefined,
        source: url ? 'linkedin' : 'manual', // Can be enhanced to detect source
        sourceUrl: url || parsedData.sourceUrl,
        tags: parsedData.skills || [],
        sponsorship: sponsorship,
        notes: undefined // Notes are now empty since requirements/benefits moved to description
      };

      console.log('✅ Job Parse API - Parsing complete, returning response');
      return NextResponse.json({
        success: true,
        data: jobData,
        extracted: {
          skills: parsedData.skills || [],
          requirements: parsedData.requirements || [],
          benefits: parsedData.benefits || [],
          jobType: parsedData.jobType,
          experience: parsedData.experience,
          education: parsedData.education
        }
      });
    } catch (error) {
      console.error('❌ Job Parse API - Error parsing job:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error('❌ Job Parse API - Error details:', { errorMessage, errorStack });
      return NextResponse.json(
        { 
          error: 'Failed to parse job description',
          details: errorMessage,
          ...(process.env.NODE_ENV === 'development' && { stack: errorStack })
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('❌ Job Parse API - Outer catch error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('❌ Job Parse API - Outer error details:', { errorMessage, errorStack });
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: errorMessage,
        ...(process.env.NODE_ENV === 'development' && { stack: errorStack })
      },
      { status: 500 }
    );
  }
}

