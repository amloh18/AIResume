#!/usr/bin/env node

/**
 * Script to setup admin users via API endpoint
 * Usage: node scripts/setup-admin-users.js
 */

const adminUsers = [
  {
    email: 'amarl@cvcircle.io',
    password: 'Iwtglbutgl@1995',
    role: 'superadmin'
  },
  {
    email: 'amlowwh@gmail.com',
    password: 'Iwtglbutgl@1995',
    role: 'superadmin'
  }
];

async function setupAdminUsers() {
  try {
    console.log('🚀 Setting up admin users...');
    console.log('📧 Users to create:');
    adminUsers.forEach(user => {
      console.log(`   - ${user.email} (${user.role})`);
    });
    console.log('');

    // Make API call to manage admin users
    const response = await fetch('http://localhost:3000/api/admin/manage-users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'reset-and-create',
        users: adminUsers
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (result.success) {
      console.log('✅ Admin users setup completed successfully!');
      console.log(`🗑️  Deleted ${result.deletedCount} existing admin users`);
      console.log('👥 Created users:');
      
      result.createdUsers.forEach(user => {
        const status = user.status === 'created' ? '✅' : 
                     user.status === 'already_exists' ? '⚠️' : '❌';
        console.log(`   ${status} ${user.email} (${user.role}) - ${user.status}`);
        if (user.error) {
          console.log(`      Error: ${user.error}`);
        }
      });

      console.log('');
      console.log('🔐 You can now sign in at: http://localhost:3000/admin/signin');
      console.log('🔑 Password for both users: Iwtglbutgl@1995');
      
    } else {
      console.error('❌ Failed to setup admin users:', result.error);
      if (result.details) {
        console.error('   Details:', result.details);
      }
    }

  } catch (error) {
    console.error('❌ Error setting up admin users:', error.message);
    console.log('');
    console.log('💡 Make sure the development server is running:');
    console.log('   npm run dev');
    console.log('   or');
    console.log('   yarn dev');
  }
}

// Run the script
setupAdminUsers();
