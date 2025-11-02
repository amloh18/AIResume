/**
 * Safe Resource Loader Utilities
 * 
 * These utilities safely load external resources (CSS, fonts, etc.)
 * and ensure that promises are rejected with proper Error objects,
 * not Event objects.
 */

/**
 * Safely loads a CSS stylesheet and returns a promise
 * @param url - The URL of the stylesheet to load
 * @param options - Optional configuration
 * @returns Promise that resolves when the stylesheet is loaded
 */
export function loadStylesheet(
  url: string,
  options: {
    rel?: string;
    media?: string;
    id?: string;
    onError?: (error: Error) => void;
  } = {}
): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if the stylesheet is already loaded
    const existingLink = document.querySelector(`link[href="${url}"]`);
    if (existingLink) {
      resolve();
      return;
    }

    const link = document.createElement('link');
    link.rel = options.rel || 'stylesheet';
    link.href = url;
    
    if (options.media) {
      link.media = options.media;
    }
    
    if (options.id) {
      link.id = options.id;
    }

    // Success handler
    link.onload = () => {
      resolve();
    };

    // Error handler - CRITICAL: Reject with Error, not Event
    link.onerror = (event) => {
      const error = new Error(`Failed to load stylesheet: ${url}`);
      if (options.onError) {
        options.onError(error);
      }
      reject(error); // Reject with Error object, not event
    };

    // Add to head
    document.head.appendChild(link);
  });
}

/**
 * Safely loads a font and returns a promise
 * @param url - The URL of the font to load
 * @param options - Optional configuration
 * @returns Promise that resolves when the font is loaded
 */
export function loadFont(
  url: string,
  options: {
    family?: string;
    onError?: (error: Error) => void;
  } = {}
): Promise<void> {
  return new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'font';
    link.href = url;
    link.crossOrigin = 'anonymous';

    // Success handler
    link.onload = () => {
      resolve();
    };

    // Error handler - CRITICAL: Reject with Error, not Event
    link.onerror = (event) => {
      const error = new Error(`Failed to load font: ${url}`);
      if (options.onError) {
        options.onError(error);
      }
      reject(error); // Reject with Error object, not event
    };

    // Add to head
    document.head.appendChild(link);
  });
}

/**
 * Safely loads any external resource using a link element
 * @param url - The URL of the resource to load
 * @param options - Configuration for the link element
 * @returns Promise that resolves when the resource is loaded
 */
export function loadResource(
  url: string,
  options: {
    rel?: string;
    as?: string;
    type?: string;
    crossorigin?: string;
    onError?: (error: Error) => void;
  } = {}
): Promise<void> {
  return new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.href = url;
    link.rel = options.rel || 'preload';
    
    if (options.as) {
      link.as = options.as;
    }
    
    if (options.type) {
      link.type = options.type;
    }
    
    if (options.crossorigin) {
      link.crossOrigin = options.crossorigin;
    }

    // Success handler
    link.onload = () => {
      resolve();
    };

    // Error handler - CRITICAL: Reject with Error, not Event
    link.onerror = (event) => {
      const error = new Error(`Failed to load resource: ${url}`);
      if (options.onError) {
        options.onError(error);
      }
      reject(error); // Reject with Error object, not event
    };

    // Add to head
    document.head.appendChild(link);
  });
}

/**
 * Wrapper to convert any existing resource loading code to use proper error handling
 * This can be used to wrap existing promises that might reject with Event objects
 */
export function safeResourceLoader<T>(
  loader: () => Promise<T>,
  resourceName: string
): Promise<T> {
  return loader().catch((error) => {
    // If the error is an Event object, convert it to a proper Error
    if (error && typeof error === 'object' && 
        (error instanceof Event || ('target' in error && 'preventDefault' in error))) {
      const target = (error as Event).target;
      const targetInfo = target ? 
        ((target as HTMLElement).tagName || (target as HTMLElement).nodeName || 'unknown') :
        'unknown';
      
      throw new Error(
        `Failed to load resource "${resourceName}": ${targetInfo} element failed to load`
      );
    }
    
    // If it's already an Error, rethrow it
    if (error instanceof Error) {
      throw error;
    }
    
    // Otherwise, wrap it in an Error
    throw new Error(`Failed to load resource "${resourceName}": ${String(error)}`);
  });
}

