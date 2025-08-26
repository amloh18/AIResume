// Test script to verify save status functionality
const testSaveStatus = async () => {
  try {
    console.log('🧪 Testing save status functionality...');
    
    // Test data
    const testUserId = '6889b151d17daa1eaee91a5c';
    const testTitle = 'Test CV for Save Status';
    
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
    
    // Step 2: Test multiple updates to verify save status
    console.log('💾 Step 2: Testing multiple updates...');
    
    for (let i = 1; i <= 3; i++) {
      console.log(`🔄 Update ${i}/3...`);
      
      const updatedCVData = {
        ...testCVData,
        basics: {
          ...testCVData.basics,
          name: `Updated Test User ${i}`,
          summary: `Updated summary ${i} with more details...`
        }
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
      
      console.log(`📡 Update ${i} response status:`, updateResponse.status);
      
      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        console.error(`❌ Update ${i} failed:`, errorText);
        return;
      }
      
      const updateResult = await updateResponse.json();
      console.log(`✅ Update ${i} successful`);
      
      // Add a small delay between updates
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Step 3: Verify final state
    console.log('🔍 Step 3: Verifying final state...');
    const getResponse = await fetch(`/api/cvs/${cvId}?userId=${testUserId}`);
    
    if (getResponse.ok) {
      const cvData = await getResponse.json();
      console.log('✅ Final CV retrieval successful');
      console.log('📋 Final CV name:', cvData.data?.cv?.cvData?.basics?.name);
      console.log('📋 Final CV summary:', cvData.data?.cv?.cvData?.basics?.summary);
    } else {
      const errorText = await getResponse.text();
      console.error('❌ Final CV retrieval failed:', errorText);
    }
    
    console.log('🎉 Save status test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

// Run the test
testSaveStatus();
