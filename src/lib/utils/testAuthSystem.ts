// Test utility for authentication and navigation system
import SessionManager from './sessionManager';
import NavigationManager from './navigationManager';

export const testAuthSystem = () => {
  console.log('🧪 Testing Authentication and Navigation System...');

  // Test SessionManager
  const sessionManager = SessionManager.getInstance();
  console.log('✅ SessionManager singleton created');

  // Test route tracking
  sessionManager.updateRoute('/dashboard');
  console.log('✅ Route tracking:', sessionManager.getLastRoute());

  // Test activity tracking
  sessionManager.updateActivity();
  console.log('✅ Activity tracking:', sessionManager.isSessionValid());

  // Test NavigationManager
  const navigationManager = NavigationManager.getInstance();
  console.log('✅ NavigationManager singleton created');

  // Test route classification
  console.log('✅ Protected routes:', navigationManager.isProtectedRoute('/dashboard'));
  console.log('✅ Public routes:', navigationManager.isPublicRoute('/'));
  console.log('✅ Public routes:', navigationManager.isPublicRoute('/auth/signin'));

  // Test navigation prevention
  navigationManager.setAuthenticationStatus(true);
  console.log('✅ Navigation prevention (authenticated):', 
    navigationManager.shouldPreventNavigation('/dashboard', '/'));

  navigationManager.setAuthenticationStatus(false);
  console.log('✅ Navigation prevention (unauthenticated):', 
    navigationManager.shouldPreventNavigation('/', '/dashboard'));

  console.log('🎉 Authentication system test completed');
};

export const testSessionTimeout = () => {
  console.log('⏰ Testing Session Timeout...');
  
  const sessionManager = SessionManager.getInstance();
  
  // Simulate old activity
  const oldTime = Date.now() - (6 * 60 * 1000); // 6 minutes ago
  (sessionManager as any).lastActivity = oldTime;
  
  console.log('✅ Session validity check:', sessionManager.isSessionValid());
  
  // Reset activity
  sessionManager.updateActivity();
  console.log('✅ Session validity after activity:', sessionManager.isSessionValid());
  
  console.log('🎉 Session timeout test completed');
};

export const testRouteGuards = () => {
  console.log('🛡️ Testing Route Guards...');
  
  const navigationManager = NavigationManager.getInstance();
  
  // Test authenticated user trying to access public routes
  navigationManager.setAuthenticationStatus(true);
  
  const testCases = [
    { from: '/dashboard', to: '/', shouldPrevent: true },
    { from: '/studio', to: '/auth/signin', shouldPrevent: true },
    { from: '/dashboard', to: '/dashboard/analytics', shouldPrevent: false },
    { from: '/studio', to: '/studio/new', shouldPrevent: false },
  ];
  
  testCases.forEach(({ from, to, shouldPrevent }) => {
    const result = navigationManager.shouldPreventNavigation(from, to);
    const status = result === shouldPrevent ? '✅' : '❌';
    console.log(`${status} ${from} -> ${to}: ${result} (expected: ${shouldPrevent})`);
  });
  
  console.log('🎉 Route guards test completed');
};
