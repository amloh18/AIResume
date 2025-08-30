/**
 * Utility functions for handling user IDs across different authentication methods
 */

/**
 * Check if a user ID is a valid MongoDB ObjectId
 */
export function isMongoDBObjectId(userId: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(userId);
}

/**
 * Check if a user ID is a Google OAuth ID
 */
export function isGoogleOAuthId(userId: string): boolean {
  return userId.includes('.') || userId.length > 24;
}

/**
 * Validate user ID format and return the appropriate type
 */
export function validateUserId(userId: string): {
  isValid: boolean;
  type: 'mongodb' | 'google' | 'invalid';
  message?: string;
} {
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

/**
 * Get MongoDB user ID from session or localStorage
 * Handles conversion from Google OAuth ID to MongoDB ObjectId if needed
 */
export async function getMongoDBUserId(): Promise<string | null> {
  try {
    // First, try to get user ID from session or localStorage
    let userId: string | null = null;
    
    // Check if we're in a browser environment
    if (typeof window !== 'undefined') {
      const userData = localStorage.getItem('user');
      if (userData) {
        try {
          const parsedUser = JSON.parse(userData);
          userId = parsedUser.id;
        } catch (error) {
          console.error('Error parsing user data from localStorage:', error);
        }
      }
    }
    
    if (!userId) {
      console.log('No user ID found in localStorage');
      return null;
    }
    
    // Validate the user ID
    const validation = validateUserId(userId);
    
    if (!validation.isValid) {
      console.error('Invalid user ID:', validation.message);
      return null;
    }
    
    // If it's already a MongoDB ObjectId, return it
    if (validation.type === 'mongodb') {
      return userId;
    }
    
    // If it's a Google OAuth ID, fetch the MongoDB user ID from the server
    if (validation.type === 'google') {
      console.log('Google OAuth ID detected, fetching MongoDB user ID...');
      try {
        const userResponse = await fetch('/api/user');
        if (userResponse.ok) {
          const userData = await userResponse.json();
          if (userData.success && userData.user && userData.user.id) {
            console.log('Found MongoDB user ID:', userData.user.id);
            return userData.user.id;
          } else {
            console.error('Could not retrieve user data from server');
            return null;
          }
        } else {
          console.error('Failed to fetch user data from server');
          return null;
        }
      } catch (error) {
        console.error('Error fetching MongoDB user ID:', error);
        return null;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error in getMongoDBUserId:', error);
    return null;
  }
}

/**
 * Validate and convert user ID for API calls
 * Returns the MongoDB ObjectId string or throws an error
 */
export async function validateAndGetMongoDBUserId(userId: string): Promise<string> {
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
      const userResponse = await fetch('/api/user');
      if (userResponse.ok) {
        const userData = await userResponse.json();
        if (userData.success && userData.user && userData.user.id) {
          console.log('Found MongoDB user ID:', userData.user.id);
          return userData.user.id;
        } else {
          throw new Error('Could not retrieve user data from server');
        }
      } else {
        throw new Error('Failed to fetch user data from server');
      }
    } catch (error) {
      console.error('Error fetching MongoDB user ID:', error);
      throw new Error('Failed to validate user ID. Please try logging in again.');
    }
  }
  
  throw new Error('Invalid user ID format');
}
