import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import { CVJourneyRelationshipService } from '@/lib/services/cvJourneyRelationshipService';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'User ID is required' },
        { status: 400 }
      );
    }

    console.log('🔍 Testing CV Journey relationships for user:', userId);

    // Test 1: Get all CV Journeys for user
    const journeys = await CVJourneyRelationshipService.getAllJourneysForUser(userId);
    console.log(`✅ Found ${journeys.length} CV Journeys`);

    // Test 2: Get CVs with journey info
    const cvsWithJourney = await CVJourneyRelationshipService.getCVsWithJourneyInfo(userId);
    console.log(`✅ Found ${cvsWithJourney.length} CVs with journey info`);

    // Test 3: Get Cover Letters with journey info
    const coverLettersWithJourney = await CVJourneyRelationshipService.getCoverLettersWithJourneyInfo(userId);
    console.log(`✅ Found ${coverLettersWithJourney.length} Cover Letters with journey info`);

    // Test 4: Get Master CV
    const masterCV = await CVJourneyRelationshipService.getMasterCV(userId);
    console.log(`✅ Master CV: ${masterCV ? 'Found' : 'Not found'}`);

    // Test 5: Validate relationships for each journey
    const validationResults = await Promise.all(
      journeys.map(journey => 
        CVJourneyRelationshipService.validateJourneyRelationships(journey.journeyId)
      )
    );

    const validJourneys = validationResults.filter(result => result.isValid);
    const invalidJourneys = validationResults.filter(result => !result.isValid);

    console.log(`✅ Valid journeys: ${validJourneys.length}`);
    console.log(`⚠️ Invalid journeys: ${invalidJourneys.length}`);

    // Summary statistics
    const stats = {
      totalJourneys: journeys.length,
      totalCVs: cvsWithJourney.length,
      totalCoverLetters: coverLettersWithJourney.length,
      masterCVExists: !!masterCV,
      validJourneys: validJourneys.length,
      invalidJourneys: invalidJourneys.length,
      journeysWithCV: journeys.filter(j => j.cvId).length,
      journeysWithCoverLetter: journeys.filter(j => j.coverLetterId).length,
      journeysWithATSScore: journeys.filter(j => j.atsScore).length,
      completedJourneys: journeys.filter(j => j.status === 'completed').length
    };

    return NextResponse.json({
      success: true,
      message: 'CV Journey relationships test completed',
      data: {
        stats,
        journeys: journeys.map(j => ({
          journeyId: j.journeyId,
          jobTitle: j.jobTitle,
          company: j.company,
          status: j.status,
          currentStep: j.currentStep,
          hasCV: !!j.cvId,
          hasCoverLetter: !!j.coverLetterId,
          hasATSScore: !!j.atsScore
        })),
        cvsWithJourney: cvsWithJourney.map(cv => ({
          documentId: cv.documentId,
          title: cv.title,
          hasJourney: !!cv.journeyId,
          jobTitle: cv.jobTitle,
          company: cv.company
        })),
        coverLettersWithJourney: coverLettersWithJourney.map(cl => ({
          documentId: cl.documentId,
          title: cl.title,
          hasJourney: !!cl.journeyId,
          jobTitle: cl.jobTitle,
          company: cl.company
        })),
        validationResults: validationResults.map((result, index) => ({
          journeyId: journeys[index].journeyId,
          isValid: result.isValid,
          issues: result.issues
        }))
      }
    });

  } catch (error: any) {
    console.error('CV Journey relationships test error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to test CV Journey relationships',
        error: error.message 
      },
      { status: 500 }
    );
  }
}
