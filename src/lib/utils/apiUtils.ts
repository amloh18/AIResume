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

// Enhanced fetch function that includes auth headers and userId as query parameter
export const authenticatedFetchWithUserId = async (url: string, userId?: string, options: RequestInit = {}) => {
  const baseUrl = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

  if (userId) {
    baseUrl.searchParams.set('userId', userId);
  }

  const headers = {
    ...getAuthHeaders(),
    ...options.headers,
  };

  return fetch(baseUrl.toString(), {
    ...options,
    headers,
  });
};
