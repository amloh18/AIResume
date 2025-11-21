import { NextRequest, NextResponse } from 'next/server';
import { getJobParserService } from '@/lib/services/jobParserService';
import { authenticateRequest } from '@/lib/utils/auth-helpers-api';
import { verifySponsorship } from '@/lib/services/sponsorshipVerificationService';

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const userId = auth.userId;

    const body = await request.json();
    const { text, url } = body;

    if (!text && !url) {
      return NextResponse.json(
        { error: 'Either text or url is required' },
        { status: 400 }
      );
    }

    const parserService = getJobParserService();
    let parsedData;

    try {
      if (url) {
        // Try URL parsing first (uses puppeteer)
        try {
          parsedData = await parserService.parseJobFromUrl(url);
        } catch (error) {
          // Fallback to LLM parsing if URL fetch fails
          console.log('URL parsing failed, falling back to LLM:', error);
          parsedData = await parserService.parseJobDescription(url, true);
        }
      } else {
        // Use LLM to parse text
        parsedData = await parserService.parseJobDescription(text, false);
      }

      // Verify sponsorship based on company and location
      let sponsorship: 'yes' | 'no' | 'unknown' = 'unknown';
      if (parsedData.company && parsedData.location) {
        try {
          const sponsorshipResult = await verifySponsorship(parsedData.company, parsedData.location);
          // If any country shows verified, set to 'yes', otherwise 'no'
          if (sponsorshipResult.results && sponsorshipResult.results.length > 0) {
            const hasVerified = sponsorshipResult.results.some(result => result.isVerified === true);
            sponsorship = hasVerified ? 'yes' : 'no';
          }
        } catch (sponsorshipError) {
          console.error('Error verifying sponsorship:', sponsorshipError);
          // Keep as 'unknown' if verification fails
        }
      }

      // Build job description with requirements and benefits
      let jobDescription = parsedData.description || '';
      
      // Add requirements if available
      if (parsedData.requirements && parsedData.requirements.length > 0) {
        const requirementsText = `\n\nRequirements:\n${parsedData.requirements.join('\n')}`;
        jobDescription += requirementsText;
      }
      
      // Add benefits if available
      if (parsedData.benefits && parsedData.benefits.length > 0) {
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
      console.error('Error parsing job:', error);
      return NextResponse.json(
        { 
          error: 'Failed to parse job description',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Parse job API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

