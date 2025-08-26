// Test script to check CV API
const testCVAPI = async () => {
  try {
    // Get user ID from localStorage (if available)
    const userData = localStorage.getItem('user');
    let userId = null;
    
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        userId = parsedUser.id;
        console.log('🔍 Test - Found user ID in localStorage:', userId);
      } catch (error) {
        console.error('❌ Test - Error parsing user data:', error);
      }
    }
    
    if (!userId) {
      console.log('❌ Test - No user ID found');
      return;
    }
    
    console.log('🔍 Test - Making API call to:', `/api/cvs?userId=${userId}`);
    
    const response = await fetch(`/api/cvs?userId=${userId}`);
    console.log('🔍 Test - Response status:', response.status);
    console.log('🔍 Test - Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const contentType = response.headers.get('content-type');
      console.log('🔍 Test - Content type:', contentType);
      
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        console.log('🔍 Test - Full response:', JSON.stringify(data, null, 2));
        console.log('🔍 Test - CVs found:', data.data?.cvs?.length || 0);
        console.log('🔍 Test - CVs array:', data.data?.cvs);
      } else {
        const textResponse = await response.text();
        console.log('🔍 Test - Non-JSON response:', textResponse.substring(0, 500));
      }
    } else {
      console.error('❌ Test - API call failed with status:', response.status);
      const errorText = await response.text();
      console.error('❌ Test - Error response:', errorText.substring(0, 500));
    }
  } catch (error) {
    console.error('❌ Test - Error:', error);
  }
};

// Run the test
testCVAPI();
