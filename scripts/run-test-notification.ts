/**
 * Node.js script to test notification toast
 * This script makes an API call to create a test notification
 * The toast will appear automatically in the browser via SSE
 * 
 * Usage: npx tsx scripts/run-test-notification.ts
 */

import fetch from 'node-fetch';

const API_URL = process.env.API_URL || 'http://localhost:3000';

async function testNotificationToast() {
  console.log('🧪 Starting notification toast test...\n');
  console.log(`📡 API URL: ${API_URL}\n`);

  try {
    console.log('1️⃣ Creating test notification via API...');
    
    const response = await fetch(`${API_URL}/api/notifications/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: '🧪 Test Notification Toast',
        message: 'If you see this toast notification, the system is working correctly! This notification was created via the test script.',
        type: 'system_update',
        interactive: false,
      }),
    });

    const data = await response.json() as any;

    if (response.ok) {
      console.log('✅ Notification created successfully!');
      console.log('📋 Notification details:', {
        id: data.notification?.id,
        title: data.notification?.title,
        type: data.notification?.type,
        message: data.notification?.message,
      });
      console.log('\n🍞 A toast should appear automatically in your browser within a few seconds...');
      console.log('👀 Watch the top-right corner of your browser for the toast notification.');
      console.log('\n💡 Make sure you have the dashboard open in your browser at:', `${API_URL}/dashboard`);
      return data;
    } else {
      console.error('❌ Failed to create notification:', data);
      throw new Error(data.error || 'Failed to create notification');
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Troubleshooting:');
    console.log('   - Make sure the server is running on', API_URL);
    console.log('   - Check that the API endpoint is accessible');
    console.log('   - Verify the user exists in the database');
    process.exit(1);
  }
}

// Run the test
testNotificationToast()
  .then(() => {
    console.log('\n✅ Test completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });

