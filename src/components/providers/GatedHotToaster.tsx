'use client';

import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Toaster } from '@/lib/hot-toast';
import { isToastSuppressedPath } from '@/lib/utils/toast-suppression';

/**
 * react-hot-toast's `<Toaster/>` is the only thing that can paint a toast, so
 * gating its render is what actually makes a public page silent.
 *
 * Suppression is derived here **during render** rather than read from the shared
 * suppression store, because that store only updates from an effect — i.e. after
 * the first paint. Deriving it means the Toaster is absent from the first paint of
 * a public page, with no flash of a queued toast.
 *
 * Must be rendered inside `SessionProvider` (it calls `useSession`).
 */
export default function GatedHotToaster() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const isAuthenticated = status === 'authenticated' && !!session?.user;

  if (isToastSuppressedPath(pathname, isAuthenticated)) return null;

  return <Toaster position="bottom-right" />;
}
