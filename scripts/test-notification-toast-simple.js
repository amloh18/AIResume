/**
 * Simple Browser Console Script to Test Notification Toast
 * 
 * INSTRUCTIONS:
 * 1. Open your browser console (F12 or Cmd+Option+I)
 * 2. Make sure you're on an authenticated page (e.g., /dashboard or /resume-enhancer)
 * 3. Copy and paste this entire script into the console
 * 4. The script will automatically test the notification toast
 */

(async function testNotificationToast() {
  console.log('🧪 Starting notification toast test...\n');

  // Test 1: Check NotificationCenter visibility
  console.log('1️⃣ Checking NotificationCenter visibility...');
  const notificationCenter = document.querySelector('div[class*="rounded-2xl"][class*="border"][class*="shadow-xl"]');
  if (notificationCenter) {
    const rect = notificationCenter.getBoundingClientRect();
    console.log('✅ NotificationCenter found at:', {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
      visible: rect.width > 0 && rect.height > 0
    });
  } else {
    console.log('⚠️ NotificationCenter not found (may be closed)');
  }

  // Test 2: Create a test notification via API
  console.log('\n2️⃣ Creating test notification via API...');
  try {
    const response = await fetch('/api/notifications/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: '🧪 Test Notification Toast',
        message: 'If you see this toast notification, the system is working correctly! This notification was created via the test script.',
        type: 'system_update',
        interactive: false,
      }),
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Notification created successfully!');
      console.log('📋 Notification details:', {
        id: data.notification?.id,
        title: data.notification?.title,
        type: data.notification?.type,
      });
      console.log('\n🍞 A toast should appear automatically in a few seconds...');
      console.log('👀 Watch the top-right corner of your screen for the toast notification.');
      
      // Wait a moment and check if toast appeared
      setTimeout(() => {
        const toast = document.querySelector('[role="status"], [data-radix-toast-viewport]');
        if (toast) {
          console.log('✅ Toast element found in DOM!');
        } else {
          console.log('⚠️ Toast element not found yet. It may appear via React state.');
        }
      }, 1000);
      
      return data;
    } else {
      console.error('❌ Failed to create notification:', data);
      throw new Error(data.error || 'Failed to create notification');
    }
  } catch (error) {
    console.error('❌ Error:', error);
    console.log('\n💡 Troubleshooting:');
    console.log('   - Make sure you are logged in');
    console.log('   - Check that you are on an authenticated page (not /sign-in)');
    console.log('   - Verify the API endpoint is accessible');
    return null;
  }
})();

