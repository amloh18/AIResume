// Test script to verify CV saving functionality
const testCVSave = async () => {
  try {
    console.log('🧪 Testing CV save functionality...');
    
    // Test data
    const testUserId = '6889b151d17daa1eaee91a5c'; // Use a valid user ID
    const testTitle = 'Test CV for Save';
    
    // Test CV data structure
    const testCVData = {
      basics: {
        name: 'Test User',
        label: 'Software Developer',
        image: '',
        email: 'test@example.com',
        phone: '+1234567890',
        url: '',
        summary: 'A passionate software developer with experience in...',
        location: {
          address: '',
          postalCode: '',
          city: 'Test City',
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
    
    // Step 1: Create a CV
    console.log('📝 Step 1: Creating CV...');
    const createResponse = await fetch('/api/cvs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: testUserId,
        title: testTitle,
        cvData: testCVData,
        type: 'cv'
      }),
    });
    
    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error('❌ CV creation failed:', errorText);
      return;
    }
    
    const createResult = await createResponse.json();
    const cvId = createResult.data?.cv?.id || createResult.data?.cv?._id || createResult.id || createResult._id;
    console.log('✅ CV created with ID:', cvId);
    
    // Step 2: Update the CV (simulate save)
    console.log('💾 Step 2: Updating CV...');
    const updatedCVData = {
      ...testCVData,
      basics: {
        ...testCVData.basics,
        name: 'Updated Test User',
        summary: 'Updated summary with more details...'
      },
      work: [
        {
          name: 'Test Company',
          position: 'Software Developer',
          startDate: '2023-01',
          endDate: '2024-01',
          summary: 'Developed web applications using React and Node.js',
          highlights: ['Built responsive UI components', 'Implemented REST APIs']
        }
      ]
    };
    
    const updateResponse = await fetch(`/api/cvs/${cvId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: testUserId,
        cvData: updatedCVData
      }),
    });
    
    console.log('📡 Update response status:', updateResponse.status);
    
    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error('❌ CV update failed:', errorText);
      return;
    }
    
    const updateResult = await updateResponse.json();
    console.log('✅ CV update successful:', updateResult);
    
    // Step 3: Verify the update by fetching the CV
    console.log('🔍 Step 3: Verifying update...');
    const getResponse = await fetch(`/api/cvs/${cvId}?userId=${testUserId}`);
    
    if (getResponse.ok) {
      const cvData = await getResponse.json();
      console.log('✅ CV retrieval successful');
      console.log('📋 CV data basics:', cvData.data?.cv?.cvData?.basics);
      console.log('💼 CV work experience:', cvData.data?.cv?.cvData?.work);
    } else {
      const errorText = await getResponse.text();
      console.error('❌ CV retrieval failed:', errorText);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

// Run the test
testCVSave();
