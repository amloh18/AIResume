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

  /*
   * `containerStyle` is where react-hot-toast accepts a z-index, and it is the
   * only thing that decides whether a toast can be seen over the current surface.
   * Its default (9999) is below the journey/job sidebars (z-[99999]) and their
   * nested modals, so toasts raised *from* the sidebar — save result, apply
   * failure, copy confirmation — appeared behind the panel that caused them.
   * `2147483000` is the top-of-stack value already used across this app.
   */
  return <Toaster position="bottom-right" containerStyle={{ zIndex: 2147483000 }} />;
}
