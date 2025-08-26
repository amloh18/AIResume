// Test script to debug CV delete issue
const testCVDelete = async (cvId) => {
  try {
    console.log('🔍 Test - Starting CV delete test for CV ID:', cvId);
    
    // Get user ID from localStorage or session
    const userData = localStorage.getItem('user');
    let userId = null;
    
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        userId = parsedUser.id || parsedUser._id;
        console.log('🔍 Test - Found user ID in localStorage:', userId);
      } catch (error) {
        console.error('❌ Test - Error parsing user data:', error);
      }
    }
    
    if (!userId) {
      console.log('❌ Test - No user ID found');
      return;
    }
    
    // Validate CV ID format
    const objectIdRegex = /^[0-9a-fA-F]{24}$/;
    if (!objectIdRegex.test(cvId)) {
      console.error('❌ Test - Invalid CV ID format:', cvId);
      return;
    }
    
    console.log('🔍 Test - Making DELETE request to:', `/api/cvs/${cvId}?userId=${userId}`);
    
    const response = await fetch(`/api/cvs/${cvId}?userId=${userId}`, {
      method: 'DELETE',
    });
    
    console.log('🔍 Test - Response status:', response.status);
    console.log('🔍 Test - Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const result = await response.json();
        console.log('🔍 Test - Success response:', result);
      } else {
        const textResponse = await response.text();
        console.log('🔍 Test - Non-JSON success response:', textResponse.substring(0, 500));
      }
    } else {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const errorResult = await response.json();
        console.error('❌ Test - Error response:', errorResult);
      } else {
        const errorText = await response.text();
        console.error('❌ Test - Non-JSON error response:', errorText.substring(0, 500));
      }
    }
  } catch (error) {
    console.error('❌ Test - Error:', error);
  }
};

// Function to get CV IDs from the current page
const getCVIds = () => {
  const cvElements = document.querySelectorAll('[data-cv-id]');
  const cvIds = Array.from(cvElements).map(el => el.getAttribute('data-cv-id'));
  console.log('🔍 Test - Found CV IDs on page:', cvIds);
  return cvIds;
};

// Export for use in browser console
window.testCVDelete = testCVDelete;
window.getCVIds = getCVIds;

console.log('✅ Test functions loaded. Use:');
console.log('- testCVDelete("cv-id-here") to test delete');
console.log('- getCVIds() to get CV IDs from current page');
