// Utility function to add authentication headers for API requests
export const getAuthHeaders = () => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Check if user is authenticated via Firebase
  if (typeof window !== 'undefined') {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        if (user.firebaseUid) {
          headers['x-firebase-user-id'] = user.firebaseUid;
        }
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
  }

  return headers;
};

// Enhanced fetch function that automatically includes auth headers
export const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
  const headers = {
    ...getAuthHeaders(),
    ...options.headers,
  };

  return fetch(url, {
    ...options,
    headers,
  });
};
