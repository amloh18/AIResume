// Test script to verify CV creation from Dashboard
const testCVCreation = async () => {
  try {
    console.log('🧪 Testing CV creation from Dashboard...');
    
    // Test data
    const testUserId = '6889b151d17daa1eaee91a5c'; // Use a valid user ID
    const testTitle = 'Test CV from Dashboard';
    
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
    
    // Test CV creation
    const response = await fetch('/api/cvs', {
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
    
    console.log('📡 Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ CV creation failed:', errorText);
      return;
    }
    
    const result = await response.json();
    console.log('✅ CV creation successful:', result);
    
    // Test CV retrieval
    const cvId = result.data?.cv?.id || result.data?.cv?._id || result.id || result._id;
    console.log('🔍 CV ID extracted:', cvId);
    
    if (cvId) {
      const getResponse = await fetch(`/api/cvs/${cvId}?userId=${testUserId}`);
      console.log('📡 Get CV response status:', getResponse.status);
      
      if (getResponse.ok) {
        const cvData = await getResponse.json();
        console.log('✅ CV retrieval successful:', cvData);
      } else {
        const errorText = await getResponse.text();
        console.error('❌ CV retrieval failed:', errorText);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

// Run the test
testCVCreation();
