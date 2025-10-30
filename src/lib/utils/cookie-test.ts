// Test utility for cookie cleanup functionality
// This helps verify that the 431 error fix is working correctly

/**
 * Test function to simulate cookie bloat and cleanup
 * Run this in browser console to test the cleanup functionality
 */
export function testCookieCleanup() {
  if (typeof window === 'undefined') {
    console.log('This test can only run in a browser environment');
    return;
  }

  console.log('🧪 Testing cookie cleanup functionality...');
  
  // Import the cleanup function dynamically
  import('./session-cleanup').then(({ clearOversizedSessionCookies }) => {
    // 1. Check initial cookie count
    const initialCookies = document.cookie.split(';').filter(c => c.trim());
    console.log(`📊 Initial cookie count: ${initialCookies.length}`);
    console.log('Current cookies:', initialCookies);
    
    // 2. Run cleanup
    console.log('🧹 Running cleanup...');
    clearOversizedSessionCookies();
    
    // 3. Check after cleanup
    setTimeout(() => {
      const afterCookies = document.cookie.split(';').filter(c => c.trim());
      console.log(`📊 Cookie count after cleanup: ${afterCookies.length}`);
      console.log('Remaining cookies:', afterCookies);
      
      // 4. Check if NextAuth cookies are still present (they should be)
      const nextAuthCookies = afterCookies.filter(c => 
        c.includes('next-auth') || c.includes('__Secure-') || c.includes('__Host-')
      );
      console.log(`🔐 NextAuth cookies (should remain): ${nextAuthCookies.length}`);
      console.log('NextAuth cookies:', nextAuthCookies);
      
      // 5. Test manual cleanup for legacy cookies
      console.log('🧹 Testing legacy cookie removal...');
      const legacyCookies = afterCookies.filter(c => 
        c.includes('auth-session') || 
        c.includes('auth-token') || 
        c.includes('csrf-token') || 
        c.includes('session-info')
      );
      
      if (legacyCookies.length > 0) {
        console.log('⚠️ Found legacy cookies that should be cleaned up:', legacyCookies);
        clearOversizedSessionCookies();
      }
      
      console.log('✅ Cookie cleanup test completed');
    }, 500);
  });
}

/**
 * Monitor cookie size and count in real-time
 */
export function monitorCookies() {
  if (typeof window === 'undefined') {
    console.log('This monitor can only run in a browser environment');
    return;
  }

  console.log('📊 Starting cookie monitoring...');
  
  function checkCookies() {
    const allCookies = document.cookie.split(';').filter(c => c.trim());
    const totalSize = document.cookie.length;
    
    console.log(`📊 Cookie Stats - Count: ${allCookies.length}, Size: ${totalSize} chars`);
    
    // Check for oversized cookies
    allCookies.forEach((cookie, index) => {
      const [name, value] = cookie.split('=');
      if (value && value.length > 2000) {
        console.warn(`⚠️ Oversized cookie ${index + 1}: ${name} (${value.length} chars)`);
      }
    });
    
    // Check for too many cookies
    if (allCookies.length > 10) {
      console.warn(`⚠️ High cookie count: ${allCookies.length} cookies detected`);
    }
    
    // Check for 431 error indicators
    if (totalSize > 8000) {
      console.error(`🚨 Potential 431 error risk: Total cookie size ${totalSize} chars exceeds safe limit`);
    }
  }
  
  // Check immediately and then every 10 seconds
  checkCookies();
  const interval = setInterval(checkCookies, 10000);
  
  return () => {
    clearInterval(interval);
    console.log('🛑 Cookie monitoring stopped');
  };
}

/**
 * Nuclear option: Remove ALL non-essential cookies
 */
export function nuclearCleanupAndReload() {
  if (typeof window === 'undefined') {
    console.log('This function can only run in a browser environment');
    return;
  }

  console.log('💥 NUCLEAR CLEANUP: Removing all non-essential cookies');
  
  import('./session-cleanup').then(({ nuclearCleanupAllNonEssentialCookies }) => {
    nuclearCleanupAllNonEssentialCookies();
    
    setTimeout(() => {
      console.log('🔄 Nuclear cleanup complete, reloading page...');
      window.location.reload();
    }, 1000);
  });
}

/**
 * Force cleanup and reload if needed
 */
export function forceCleanupAndReload() {
  if (typeof window === 'undefined') {
    console.log('This function can only run in a browser environment');
    return;
  }

  console.log('🚨 Force cleanup and reload initiated');
  
  import('./session-cleanup').then(({ clearOversizedSessionCookies }) => {
    clearOversizedSessionCookies();
    
    setTimeout(() => {
      console.log('🔄 Reloading page...');
      window.location.reload();
    }, 1000);
  });
}

// Export test commands for easy access
if (typeof window !== 'undefined') {
  (window as any).testCookieCleanup = testCookieCleanup;
  (window as any).monitorCookies = monitorCookies;
  (window as any).forceCleanupAndReload = forceCleanupAndReload;
  (window as any).nuclearCleanupAndReload = nuclearCleanupAndReload;
  
  console.log('🧪 Cookie test utilities loaded:');
  console.log('- testCookieCleanup() - Run cookie cleanup test');
  console.log('- monitorCookies() - Start cookie monitoring');
  console.log('- forceCleanupAndReload() - Force cleanup and reload');
  console.log('- nuclearCleanupAndReload() - Nuclear cleanup (removes ALL non-essential cookies)');
}