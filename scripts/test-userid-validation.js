// Test user ID validation functions

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

const firebaseUid = 'Pb2CeNSbxGYNJhKEQVGD6xYqKvs1';
const mongoId = '68b3126add4f9e4d7922d8ec';

console.log('Firebase UID:', firebaseUid);
console.log('  - Length:', firebaseUid.length);
console.log('  - Contains dot:', firebaseUid.includes('.'));
console.log('  - isMongoDBObjectId:', isMongoDBObjectId(firebaseUid));
console.log('  - isGoogleOAuthId:', isGoogleOAuthId(firebaseUid));
console.log('  - validateUserId:', validateUserId(firebaseUid));

console.log('\nMongo ID:', mongoId);
console.log('  - Length:', mongoId.length);
console.log('  - Contains dot:', mongoId.includes('.'));
console.log('  - isMongoDBObjectId:', isMongoDBObjectId(mongoId));
console.log('  - isGoogleOAuthId:', isGoogleOAuthId(mongoId));
console.log('  - validateUserId:', validateUserId(mongoId));
