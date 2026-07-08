'use client';

import { useEffect } from 'react';

export default function ErrorSuppressor() {
  useEffect(() => {
    const handler = (e: Event) => {
      let message = '';
      let stack = '';
      let filename = '';

      if (e instanceof ErrorEvent) {
        message = e.message || '';
        filename = typeof e.filename === 'string' ? e.filename : '';
        stack = '';

        const errorEvent = e as ErrorEvent & {
          reason?: { stack?: string };
          error?: { stack?: string };
        };

        if (errorEvent.reason && typeof errorEvent.reason.stack === 'string') {
          stack = errorEvent.reason.stack;
        }
        if (!stack && errorEvent.error && typeof errorEvent.error.stack === 'string') {
          stack = errorEvent.error.stack;
        }
      } else if (e instanceof PromiseRejectionEvent) {
        const reason = e.reason;
        if (reason && typeof reason === 'object' && typeof (reason as any).message === 'string') {
          message = (reason as any).message;
        }
        if (reason && typeof reason === 'object' && typeof (reason as any).stack === 'string') {
          stack = (reason as any).stack;
        }
      }

      const isEthereum =
        typeof message === 'string' &&
        (message.toLowerCase().includes('ethereum') ||
          message.toLowerCase().includes('evmask')) ||
        (typeof filename === 'string' && filename.includes('evmAsk')) ||
        (typeof stack === 'string' && stack.includes('evmAsk'));

      if (isEthereum) {
        e.stopImmediatePropagation();
        e.preventDefault();
      }
    };

    window.addEventListener('error', handler as EventListener, true);
    window.addEventListener('unhandledrejection', handler as EventListener, true);

    return () => {
      window.removeEventListener('error', handler as EventListener, true);
      window.removeEventListener('unhandledrejection', handler as EventListener, true);
    };
  }, []);

  return null;
}
