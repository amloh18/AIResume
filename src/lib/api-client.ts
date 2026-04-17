import { useAuthModalStore } from '@/lib/stores/authModalStore';

/**
 * A custom fetch wrapper that intercepts 401 Unauthorized responses
 * and automatically triggers the global Auth Modal.
 */
export async function fetchWithAuth(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const response = await fetch(input, init);

  if (response.status === 401) {
    // Attempt to parse if it's an API route response indicating unauthorized
    try {
      const isApiRoute = typeof input === 'string' && input.startsWith('/api/');
      if (isApiRoute) {
        // Trigger the auth modal
        // Store current pathname as callbackUrl if possible
        const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/dashboard';
        useAuthModalStore.getState().openModal({ view: 'signin', callbackUrl: currentPath });
      }
    } catch (e) {
      console.error('Error handling 401 intercept:', e);
    }
  }

  return response;
}