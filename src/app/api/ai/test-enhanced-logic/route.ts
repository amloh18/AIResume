import { NextRequest, NextResponse } from 'next/server';
import { EnhancedAIService } from '@/lib/services/enhancedAIService';

export async function POST(request: NextRequest) {
  try {
    const { testType } = await request.json();

    // Mock CV data for testing
    const mockCVData = {
      basics: {
        name: 'John Doe',
        email: 'john@example.com',
        summary: 'Experienced software developer with 5 years of experience in web development and team leadership.'
      },
      work: [
        {
          position: 'Senior Software Developer',
          name: 'Tech Corp',
          startDate: '2020-01-01',
          endDate: 'Present',
          summary: 'Led development of web applications using React and Node.js',
          highlights: [
            'Managed a team of 5 developers',
            'Improved system performance by 30%',
            'Reduced deployment time by 50%'
          ]
        }
      ],
      skills: [
        {
          name: 'Technical Skills',
          keywords: ['JavaScript', 'React', 'Node.js', 'Python', 'SQL']
        }
      ],
      education: [
        {
          institution: 'University of Technology',
          studyType: 'Bachelor',
          area: 'Computer Science'
        }
      ]
    };

    // Mock job data for testing
    const mockJobData = {
      id: 'job-1',
      title: 'Senior Full Stack Developer',
      company: 'Innovation Inc',
      description: 'We are looking for a Senior Full Stack Developer with experience in React, Node.js, and cloud technologies. The ideal candidate will have 5+ years of experience and strong leadership skills.',
      requirements: '5+ years experience, React, Node.js, AWS, team leadership'
    };

    let testResults: any = {};

    switch (testType) {
      case 'section-generation':
        try {
          const result = await EnhancedAIService.generateSectionContent({
            cvData: mockCVData,
            jobData: mockJobData,
            currentText: 'Developed web applications using various technologies',
            sectionType: 'workExperience',
            jobTitle: mockJobData.title,
            companyName: mockJobData.company
          });
          testResults.sectionGeneration = { success: true, content: result };
        } catch (error) {
          testResults.sectionGeneration = { success: false, error: error.message };
        }
        break;

      case 'ats-analysis':
        try {
          const result = await EnhancedAIService.generateComprehensiveATSAnalysis(mockCVData, mockJobData);
          testResults.atsAnalysis = { success: true, data: result };
        } catch (error) {
          testResults.atsAnalysis = { success: false, error: error.message };
        }
        break;

      case 'cover-letter':
        try {
          const result = await EnhancedAIService.generateCoverLetter(
            mockCVData,
            mockJobData,
            'Hiring Manager',
            mockJobData.company
          );
          testResults.coverLetter = { success: true, content: result };
        } catch (error) {
          testResults.coverLetter = { success: false, error: error.message };
        }
        break;

      case 'experience-level':
        try {
          const level = EnhancedAIService.calculateExperienceLevel(mockCVData);
          testResults.experienceLevel = { success: true, level };
        } catch (error) {
          testResults.experienceLevel = { success: false, error: error.message };
        }
        break;

      case 'keywords':
        try {
          const keywords = EnhancedAIService.extractTopKeywords(mockJobData.description, 5);
          testResults.keywords = { success: true, keywords };
        } catch (error) {
          testResults.keywords = { success: false, error: error.message };
        }
        break;

      case 'all':
        // Test all functionality
        const tests = [
          'section-generation',
          'ats-analysis', 
          'cover-letter',
          'experience-level',
          'keywords'
        ];

        for (const test of tests) {
          try {
            const response = await fetch('/api/ai/test-enhanced-logic', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ testType: test })
            });
            const data = await response.json();
            testResults[test] = data;
          } catch (error) {
            testResults[test] = { success: false, error: error.message };
          }
        }
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid test type' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      testType,
      results: testResults,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Enhanced logic test error:', error);
    return NextResponse.json(
      { success: false, error: 'Test failed' },
      { status: 500 }
    );
  }
}
