// Test script to check if the journeys API is working
const testJourneysAPI = async () => {
  try {
    console.log('Testing journeys API...');
    
    // Test with a sample user ID
    const testUserId = 'test-user-id';
    const response = await fetch(`http://localhost:3000/api/journeys?userId=${testUserId}&status=all`);
    
    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      return;
    }
    
    const result = await response.json();
    console.log('API result:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('Test failed:', error);
  }
};

// Run the test
testJourneysAPI();
