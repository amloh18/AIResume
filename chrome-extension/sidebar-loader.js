// Sidebar loader script - loads the React app
// This is an external file to comply with CSP

(function() {
  // Check if chrome.runtime is available
  if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.getURL) {
    console.error('❌ Chrome runtime API not available');
    showError('Chrome extension API not available');
    return;
  }

  // Try to load the built sidebar
  // Vite generates hashed filenames, so we need to parse index.html to get the correct script path
  const loadSidebar = async () => {
    try {
      // Fetch index.html to get the correct script paths using chrome.runtime.getURL
      const indexUrl = chrome.runtime.getURL('sidebar/dist/index.html');
      const response = await fetch(indexUrl);
      if (!response.ok) {
        throw new Error(`Failed to load index.html: ${response.status}`);
      }
      
      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      // Load CSS files first
      const cssLinks = doc.querySelectorAll('link[rel="stylesheet"]');
      cssLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href) {
          const linkEl = document.createElement('link');
          linkEl.rel = 'stylesheet';
          // Normalize path and use chrome.runtime.getURL for extension resources
          // Handle both absolute (/assets/...) and relative (./assets/...) paths
          let cssPath = href;
          if (cssPath.startsWith('/')) {
            cssPath = cssPath.substring(1);
          } else if (cssPath.startsWith('./')) {
            cssPath = cssPath.substring(2);
          }
          linkEl.href = chrome.runtime.getURL('sidebar/dist/' + cssPath);
          document.head.appendChild(linkEl);
        }
      });
      
      // Load the main script
      const scripts = doc.querySelectorAll('script[type="module"]');
      if (scripts.length > 0) {
        const scriptSrc = scripts[0].getAttribute('src');
        if (scriptSrc) {
          const script = document.createElement('script');
          script.type = 'module';
          // Normalize path and use chrome.runtime.getURL for extension resources
          // Handle both absolute (/assets/...) and relative (./assets/...) paths
          let jsPath = scriptSrc;
          if (jsPath.startsWith('/')) {
            jsPath = jsPath.substring(1);
          } else if (jsPath.startsWith('./')) {
            jsPath = jsPath.substring(2);
          }
          script.src = chrome.runtime.getURL('sidebar/dist/' + jsPath);
          
          script.onerror = (error) => {
            console.error('❌ Script load error:', error, script.src);
            showError('Failed to load sidebar script');
          };
          
          // Handle module loading errors
          const errorHandler = (event) => {
            if (event.filename && event.filename.includes('sidebar/dist')) {
              console.error('❌ Module loading error:', event.error, event.filename);
              showError('Module loading error: ' + (event.error?.message || 'Unknown error'));
            }
          };
          
          window.addEventListener('error', errorHandler, true);
          
          // Clean up error handler after successful load
          script.onload = () => {
            window.removeEventListener('error', errorHandler, true);
            console.log('✅ Sidebar script loaded successfully');
          };
          
          document.head.appendChild(script);
          return;
        }
      }
      
      throw new Error('No script found in index.html');
    } catch (error) {
      console.error('❌ Error loading sidebar:', error);
      showError(error.message || 'Failed to load sidebar');
    }
  };
  
  const showError = (message) => {
    const root = document.getElementById('root');
    if (root) {
      root.innerHTML = `
        <div style="padding: 40px; text-align: center; font-family: system-ui, sans-serif; background: #1a230f; color: white; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center;">
          <div style="width: 64px; height: 64px; background: #80FF00; border-radius: 8px; margin-bottom: 20px; display: flex; align-items: center; justify-content: center;">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L8 4V6C8 7.1 8.9 8 10 8H14C15.1 8 16 7.1 16 6V4L12 2Z" fill="white" opacity="0.95"/>
              <rect x="6" y="6" width="12" height="14" rx="2" fill="white" opacity="0.98"/>
              <line x1="9" y1="10" x2="15" y2="10" stroke="#1a230f" stroke-width="1.5" stroke-linecap="round"/>
              <line x1="9" y1="13" x2="15" y2="13" stroke="#1a230f" stroke-width="1.5" stroke-linecap="round"/>
              <line x1="9" y1="16" x2="13" y2="16" stroke="#1a230f" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </div>
          <h2 style="color: #80FF00; margin-bottom: 10px;">CVCircle Extension</h2>
          <p style="color: #ccc; margin-bottom: 20px;">${message || 'Sidebar needs to be built'}</p>
          <div style="background: #141810; padding: 20px; border-radius: 8px; text-align: left; max-width: 500px;">
            <p style="color: #fff; margin-bottom: 15px; font-weight: 600;">Build the sidebar:</p>
            <pre style="background: #0a0a0a; padding: 15px; border-radius: 4px; color: #80FF00; overflow-x: auto; margin: 0;">
cd chrome-extension/sidebar
npm install
npm run build
            </pre>
            <p style="color: #999; margin-top: 15px; font-size: 14px;">
              After building, reload the extension in Chrome.
            </p>
          </div>
        </div>
      `;
    }
  };
  
  // Start loading
  loadSidebar();
})();

