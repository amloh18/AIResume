// Utility function to add authentication headers for API requests
export const getAuthHeaders = async () => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Firebase authentication removed - using NextAuth only

  return headers;
};

// Track if we're already redirecting to prevent multiple redirects
let isRedirectingToSignIn = false;

/**
 * Handle unauthorized (401) responses by clearing session and redirecting to sign-in.
 * This prevents users from being stuck on loading spinners when their session is invalid.
 */
const handleUnauthorizedResponse = (url: string) => {
  if (typeof window === 'undefined') return; // Only on client-side
  if (isRedirectingToSignIn) return; // Prevent duplicate redirects

  isRedirectingToSignIn = true;
  console.warn(`🔒 Unauthorized response from ${url} — clearing session and redirecting to sign-in`);

  // Clear NextAuth session cookies
  const cookieNames = [
    'next-auth.session-token',
    '__Secure-next-auth.session-token',
    'next-auth.csrf-token',
    '__Secure-next-auth.csrf-token',
    'next-auth.callback-url',
    '__Secure-next-auth.callback-url',
  ];

  cookieNames.forEach(name => {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; max-age=0`;
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; max-age=0; secure`;
  });

  // Redirect to sign-in with callback to current page
  const callbackUrl = encodeURIComponent(window.location.pathname + window.location.search);
  window.location.replace(`/sign-in?callbackUrl=${callbackUrl}`);
};

// Enhanced fetch function that automatically includes auth headers
// and handles 401 Unauthorized responses by redirecting to sign-in
export const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
  const authHeaders = await getAuthHeaders();
  const headers = {
    ...authHeaders,
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // If the server returns 401 Unauthorized, clear session and redirect
  if (response.status === 401) {
    handleUnauthorizedResponse(url);
  }

  return response;
};

// Enhanced fetch function that includes auth headers and userId as query parameter
export const authenticatedFetchWithUserId = async (url: string, userId?: string, options: RequestInit = {}) => {
  const baseUrl = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

  if (userId) {
    baseUrl.searchParams.set('userId', userId);
  }

  const authHeaders = await getAuthHeaders();
  const headers = {
    ...authHeaders,
    ...options.headers,
  };

  const response = await fetch(baseUrl.toString(), {
    ...options,
    headers,
  });

  // If the server returns 401 Unauthorized, clear session and redirect
  if (response.status === 401) {
    handleUnauthorizedResponse(baseUrl.toString());
  }

  return response;
};
