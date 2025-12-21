/**
 * Test script to show notification toast
 * 
 * Usage:
 * 1. Open browser console on any authenticated page (e.g., /dashboard)
 * 2. Copy and paste this entire script
 * 3. Or run individual functions:
 *    - testDirectToast() - Shows a toast directly using the toast system
 *    - testNotificationAPI() - Creates a notification via API (will auto-show toast)
 *    - testNotificationWithAction() - Creates an interactive notification with action button
 */

// ============================================
// Method 1: Direct Toast (No API call)
// ============================================
async function testDirectToast() {
  console.log('🧪 Testing direct toast...');
  
  // Access the toast function from the global state
  // The toast system uses a global state pattern
  if (typeof window === 'undefined') {
    console.error('❌ This script must be run in the browser console');
    return;
  }

  // Try to access toast via React DevTools or window object
  // Since toast is in a module, we'll use the API method instead
  console.log('⚠️ Direct toast access requires React context. Use testNotificationAPI() instead.');
  console.log('💡 Alternatively, you can manually trigger via:');
  console.log('   window.__testToast?.({ title: "Test", description: "Hello!" })');
}

// ============================================
// Method 2: Create Notification via API (Recommended)
// This will automatically show a toast via NotificationContext
// ============================================
async function testNotificationAPI(options = {}) {
  console.log('🧪 Testing notification toast via API...');
  
  const {
    title = 'Test Notification',
    message = 'This is a test notification to verify the toast system is working correctly.',
    type = 'system_update',
    interactive = false,
    actionType = null,
  } = options;

  try {
    const response = await fetch('/api/notifications/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: null, // Will use default email from API
        type,
        title,
        message,
        interactive,
        actionType,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ Notification created successfully:', data);
      console.log('🍞 Toast should appear automatically via NotificationContext');
      return data;
    } else {
      console.error('❌ Failed to create notification:', data);
      throw new Error(data.error || 'Failed to create notification');
    }
  } catch (error) {
    console.error('❌ Error creating notification:', error);
    throw error;
  }
}

// ============================================
// Method 3: Create Interactive Notification with Action
// ============================================
async function testNotificationWithAction() {
  console.log('🧪 Testing interactive notification toast...');
  
  return testNotificationAPI({
    title: 'Interactive Test Notification',
    message: 'This notification has an action button. Click it to test the action handler.',
    type: 'job_stage_moved',
    interactive: true,
    actionType: 'review_job',
  });
}

// ============================================
// Method 4: Test Multiple Notification Types
// ============================================
async function testAllNotificationTypes() {
  console.log('🧪 Testing all notification types...');
  
  const types = [
    'system_update',
    'job_applied',
    'job_stage_moved',
    'deadline_approaching',
    'achievement',
    'documents_ready',
  ];

  const results = [];
  
  for (const type of types) {
    console.log(`\n📬 Testing type: ${type}`);
    try {
      const result = await testNotificationAPI({
        title: `Test: ${type}`,
        message: `This is a test notification of type "${type}"`,
        type,
      });
      results.push({ type, success: true, result });
      
      // Wait 2 seconds between notifications to see each toast
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      results.push({ type, success: false, error: error.message });
    }
  }

  console.log('\n📊 Test Results Summary:');
  console.table(results);
  return results;
}

// ============================================
// Method 5: Quick Test (Simple)
// ============================================
async function quickTest() {
  console.log('🚀 Quick test - creating a simple notification...');
  return testNotificationAPI({
    title: 'Quick Test',
    message: 'If you see this toast, the notification system is working! 🎉',
  });
}

// ============================================
// Method 6: Test Toast Visibility
// Check if NotificationCenter is visible and accessible
// ============================================
function testNotificationCenterVisibility() {
  console.log('🔍 Checking NotificationCenter visibility...');
  
  // Find the NotificationCenter element
  const notificationCenter = document.querySelector('[data-cursor-element-id*="cursor-el"]') ||
    document.querySelector('.absolute.right-0.top-12.z-50') ||
    document.querySelector('div[class*="rounded-2xl"][class*="border"][class*="shadow-xl"]');
  
  if (notificationCenter) {
    console.log('✅ NotificationCenter found:', notificationCenter);
    console.log('📍 Position:', notificationCenter.getBoundingClientRect());
    console.log('📐 Styles:', window.getComputedStyle(notificationCenter));
    
    // Check if it's visible
    const isVisible = window.getComputedStyle(notificationCenter).display !== 'none' &&
                     window.getComputedStyle(notificationCenter).visibility !== 'hidden' &&
                     window.getComputedStyle(notificationCenter).opacity !== '0';
    
    console.log('👁️ Is visible:', isVisible);
    return { found: true, visible: isVisible, element: notificationCenter };
  } else {
    console.log('⚠️ NotificationCenter not found in DOM');
    console.log('💡 Make sure you are on an authenticated page (e.g., /dashboard)');
    return { found: false, visible: false, element: null };
  }
}

// ============================================
// Export functions to window for easy access
// ============================================
if (typeof window !== 'undefined') {
  window.testNotificationToast = {
    direct: testDirectToast,
    api: testNotificationAPI,
    interactive: testNotificationWithAction,
    allTypes: testAllNotificationTypes,
    quick: quickTest,
    checkVisibility: testNotificationCenterVisibility,
  };

  console.log('✅ Test functions loaded! Available methods:');
  console.log('   - window.testNotificationToast.quick() - Quick test');
  console.log('   - window.testNotificationToast.api({ title, message, type }) - Custom notification');
  console.log('   - window.testNotificationToast.interactive() - Interactive notification');
  console.log('   - window.testNotificationToast.allTypes() - Test all types');
  console.log('   - window.testNotificationToast.checkVisibility() - Check NotificationCenter');
}

// Auto-run quick test if this is executed directly
if (typeof window !== 'undefined' && window.location.pathname.includes('/dashboard')) {
  console.log('🎯 Dashboard detected. Run window.testNotificationToast.quick() to test!');
}

