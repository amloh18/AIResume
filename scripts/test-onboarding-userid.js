require('dotenv').config({ path: '.env.local' });

// Test the user ID validation logic that onboarding uses
function isMongoDBObjectId(userId) {
  return /^[0-9a-fA-F]{24}$/.test(userId);
}

function isGoogleOAuthId(userId) {
  return userId.includes('.') || userId.length > 24;
}

function validateUserId(userId) {
  const userIdString = userId.toString().trim();
  
  if (isMongoDBObjectId(userIdString)) {
    return { isValid: true, type: 'mongodb' };
  }
  
  if (isGoogleOAuthId(userIdString)) {
    return { isValid: true, type: 'google' };
  }
  
  return { 
    isValid: false, 
    type: 'invalid',
    message: `Invalid user ID format. Expected MongoDB ObjectId or Google OAuth ID, got: ${userIdString.substring(0, 10)}...`
  };
}

async function validateAndGetMongoDBUserId(userId) {
  const validation = validateUserId(userId);
  
  if (!validation.isValid) {
    throw new Error(validation.message || 'Invalid user ID format');
  }
  
  if (validation.type === 'mongodb') {
    return userId;
  }
  
  if (validation.type === 'google') {
    console.log('Google OAuth ID detected, fetching MongoDB user ID...');
    try {
      // For Firebase users, send the Firebase UID in the request
      const userResponse = await fetch(`http://localhost:3000/api/user?firebaseUserId=${userId}`);
      if (userResponse.ok) {
        const userData = await userResponse.json();
        console.log('User API response:', userData);
        if (userData.success && userData.user && userData.user.id) {
          console.log('Found MongoDB user ID:', userData.user.id);
          return userData.user.id;
        } else {
          throw new Error('Could not retrieve user data from server');
        }
      } else {
        const errorText = await userResponse.text();
        console.error('API error response:', errorText);
        throw new Error('Failed to fetch user data from server');
      }
    } catch (error) {
      console.error('Error fetching MongoDB user ID:', error);
      throw new Error('Failed to validate user ID. Please try logging in again.');
    }
  }
  
  throw new Error('Invalid user ID format');
}

async function testOnboardingUserId() {
  try {
    const firebaseUid = 'Pb2CeNSbxGYNJhKEQVGD6xYqKvs1';
    console.log('🔍 Testing onboarding user ID validation for Firebase UID:', firebaseUid);
    
    const mongoUserId = await validateAndGetMongoDBUserId(firebaseUid);
    console.log('✅ Successfully got MongoDB user ID:', mongoUserId);
    
    // Now test if this would create a CV for the right user
    console.log('\n🔍 This MongoDB user ID should be used for CV creation');
    console.log('Expected user ID: 68b3126add4f9e4d7922d8ec (amarjotasl@gmail.com)');
    console.log('Actual user ID:  ', mongoUserId);
    console.log('Match:', mongoUserId === '68b3126add4f9e4d7922d8ec' ? '✅ CORRECT' : '❌ WRONG');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testOnboardingUserId();
