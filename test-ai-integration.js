const fetch = require('node-fetch');

async function testAIIntegration() {
  console.log('🧪 Testing AI Integration...\n');

  // Test 1: Content Improvement
  console.log('1. Testing Content Improvement API...');
  try {
    const improveResponse = await fetch('http://localhost:3000/api/ai/improve-content', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: 'Improve this professional summary: "Experienced developer with good skills"',
        cvData: {
          basics: {
            name: 'John Doe',
            summary: 'Experienced developer with good skills'
          }
        },
        jobData: {
          title: 'Senior Software Engineer',
          company: 'Tech Corp'
        }
      }),
    });

    const improveData = await improveResponse.json();
    console.log('✅ Content Improvement:', improveData.success ? 'SUCCESS' : 'FAILED');
    if (improveData.success) {
      console.log('   Generated content:', improveData.content.substring(0, 100) + '...');
    } else {
      console.log('   Error:', improveData.error);
    }
  } catch (error) {
    console.log('❌ Content Improvement Error:', error.message);
  }

  console.log('\n2. Testing Comprehensive Analysis API...');
  try {
    const analysisResponse = await fetch('http://localhost:3000/api/ai/comprehensive-analysis', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cvData: {
          basics: {
            name: 'John Doe',
            summary: 'Experienced developer with good skills',
            email: 'john@example.com'
          },
          work: [
            {
              position: 'Software Developer',
              name: 'Tech Company',
              summary: 'Developed web applications',
              highlights: ['Used JavaScript', 'Worked with React']
            }
          ],
          skills: [
            {
              name: 'Technical Skills',
              keywords: ['JavaScript', 'React', 'Node.js']
            }
          ]
        },
        jobData: {
          title: 'Senior Software Engineer',
          company: 'Tech Corp',
          description: 'Looking for experienced developer with React and Node.js skills',
          requirements: 'JavaScript, React, Node.js, AWS'
        }
      }),
    });

    const analysisData = await analysisResponse.json();
    console.log('✅ Comprehensive Analysis:', analysisData.success ? 'SUCCESS' : 'FAILED');
    if (analysisData.success) {
      console.log('   ATS Score:', analysisData.data?.ATSScoreAndKeywords?.score + '%');
      console.log('   Missing Keywords:', analysisData.data?.ATSScoreAndKeywords?.missingKeywords?.length || 0);
      console.log('   Matched Keywords:', analysisData.data?.ATSScoreAndKeywords?.matchedKeywords?.length || 0);
    } else {
      console.log('   Error:', analysisData.error);
    }
  } catch (error) {
    console.log('❌ Comprehensive Analysis Error:', error.message);
  }

  console.log('\n🎉 AI Integration Test Complete!');
}

// Run the test
testAIIntegration().catch(console.error);
