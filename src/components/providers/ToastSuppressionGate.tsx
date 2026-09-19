'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { setToastSuppression, isToastSuppressedPath } from '@/lib/utils/toast-suppression';
import { toast } from '@/lib/hot-toast';

/**
 * Global toast suppression gate.
 *
 * Publishes the current route + auth state to the shared suppression store, which
 * both toast systems consult at their call boundary (`src/lib/utils/toast-suppression.ts`).
 * Renders nothing — the react-hot-toast `<Toaster/>` is gated separately by
 * `GatedHotToaster`, because the suppression store is module state and only updates
 * from an effect, i.e. after the first paint.
 *
 * The previous implementation tried to suppress react-hot-toast by reassigning
 * `toast` on the `import('react-hot-toast')` namespace, which throws
 * `Cannot set property toast of #<Object> which has only a getter` — module
 * namespace objects are immutable by spec. See `src/lib/hot-toast.ts`.
 */
export default function ToastSuppressionGate() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const isAuthenticated = status === 'authenticated' && !!session?.user;
  const suppressed = isToastSuppressedPath(pathname, isAuthenticated);

  useEffect(() => {
    setToastSuppression(pathname, isAuthenticated);

    // The store is only current from this effect onwards, so a toast fired during
    // the first paint (before hydration finished) could still have been queued.
    // react-hot-toast's auto-dismiss timer lives inside `useToaster`, which never
    // runs while <Toaster/> is unmounted — so a queued toast would sit in the store
    // indefinitely and then flash on the next authed page. Drain it.
    if (suppressed) toast.removeAll();
  }, [pathname, isAuthenticated, suppressed]);

  return null;
}
