'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { setToastSuppression } from '@/hooks/use-toast';

// Also suppress react-hot-toast on public pages
let _hotToastOriginal: typeof import('react-hot-toast')['toast'] | null = null;

function overrideHotToast(pathname: string | null, isAuthenticated: boolean) {
  const isSuppressed = !isAuthenticated && pathname !== null && (
    pathname === '/' ||
    pathname === '/features' ||
    pathname === '/templates' ||
    pathname === '/privacy-policy' ||
    pathname === '/terms' ||
    pathname === '/legal' ||
    pathname === '/editor' ||
    pathname.startsWith('/sign-in') ||
    pathname.startsWith('/sign-up') ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/onboarding') ||
    pathname.startsWith('/welcome') ||
    pathname.startsWith('/admin/login') ||
    pathname.startsWith('/admin/unauthorized') ||
    pathname.startsWith('/force-logout')
  );

  if (isSuppressed && !_hotToastOriginal) {
    import('react-hot-toast').then(mod => {
      _hotToastOriginal = mod.toast;
      // Override toast to no-op on public pages
      (mod as any).toast = Object.assign(
        (...args: any[]) => ({ id: 'suppressed', dismiss: () => {}, unmount: () => {} }),
        _hotToastOriginal
      );
    });
  } else if (!isSuppressed && _hotToastOriginal) {
    import('react-hot-toast').then(mod => {
      (mod as any).toast = _hotToastOriginal;
      _hotToastOriginal = null;
    });
  }
}

/**
 * Global toast suppression gate.
 * Renders nothing. Sets the suppression state based on the current route
 * and authentication status. Toasts are suppressed on public/onboarding pages.
 */
export default function ToastSuppressionGate() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const isAuthenticated = status === 'authenticated' && !!session?.user;

  useEffect(() => {
    setToastSuppression(pathname, isAuthenticated);
    overrideHotToast(pathname, isAuthenticated);
  }, [pathname, isAuthenticated]);

  return null;
}
