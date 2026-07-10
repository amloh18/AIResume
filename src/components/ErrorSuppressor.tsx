export default function ErrorSuppressor() {
  const code = `
    (function() {
      if (typeof window === 'undefined') return;

      const isEthereumError = function(e) {
        if (!e) return false;
        const msg = (typeof e === 'string' ? e : (e.message || '')).toLowerCase();
        const stack = (e.error && e.error.stack ? e.error.stack : (e.stack || '')).toLowerCase();
        return msg.includes('ethereum') || 
               msg.includes('evmask') || 
               msg.includes('redefine property: ethereum') || 
               stack.includes('evmask');
      };

      // 1. Patch addEventListener to prevent Next.js from receiving the error
      const originalAddEventListener = window.addEventListener;
      window.addEventListener = function(type, listener, options) {
        if (type === 'error' || type === 'unhandledrejection') {
          const wrappedListener = function(e) {
            if (isEthereumError(e) || (e.reason && isEthereumError(e.reason))) {
              if (e.preventDefault) e.preventDefault();
              if (e.stopImmediatePropagation) e.stopImmediatePropagation();
              return;
            }
            if (typeof listener === 'function') {
              return listener.apply(this, arguments);
            } else if (listener && typeof listener.handleEvent === 'function') {
              return listener.handleEvent(e);
            }
          };
          return originalAddEventListener.call(window, type, wrappedListener, options);
        }
        return originalAddEventListener.call(window, type, listener, options);
      };

      // 2. Patch console.error since Next.js overlay often overrides this
      const originalConsoleError = console.error;
      console.error = function() {
        for (let i = 0; i < arguments.length; i++) {
          const arg = arguments[i];
          if (isEthereumError(arg)) {
            return;
          }
        }
        originalConsoleError.apply(console, arguments);
      };
      
      // 3. Keep the defineProperty patch just in case
      const originalDefineProperty = Object.defineProperty;
      Object.defineProperty = function(obj, prop, descriptor) {
        if (prop === 'ethereum') {
          try {
            return originalDefineProperty(obj, prop, descriptor);
          } catch (e) {
            return obj;
          }
        }
        return originalDefineProperty(obj, prop, descriptor);
      };
      
      // 4. Patch window.onerror
      const originalOnError = window.onerror;
      window.onerror = function(message, source, lineno, colno, error) {
         if (isEthereumError(error) || isEthereumError(message)) return true;
         if (originalOnError) return originalOnError.apply(this, arguments);
      };
    })();
  `;

  return (
    <script
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: code }}
    />
  );
}

