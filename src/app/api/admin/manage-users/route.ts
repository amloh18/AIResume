import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import AdminAuth from '@/models/AdminAuth';

export async function POST(request: NextRequest) {
  try {
    await getConnection();

    // Get the request body
    const { action, users } = await request.json();

    if (action === 'reset-and-create') {
      // Remove all existing admin users
      console.log('🗑️  Removing existing admin users...');
      const deleteResult = await AdminAuth.deleteMany({});
      console.log(`   Deleted ${deleteResult.deletedCount} existing admin users`);

      // Create new admin users
      console.log('👥 Creating new admin users...');
      const createdUsers = [];

      for (const userData of users) {
        try {
          const adminUser = new AdminAuth({
            email: userData.email,
            password: userData.password,
            role: userData.role || 'superadmin',
          });

          await adminUser.save();
          createdUsers.push({
            email: userData.email,
            role: userData.role || 'superadmin',
            status: 'created'
          });
          console.log(`✅ Admin user created: ${userData.email} (${userData.role || 'superadmin'})`);
        } catch (error: any) {
          if (error.code === 11000) {
            console.log(`⚠️  Admin user already exists: ${userData.email}`);
            createdUsers.push({
              email: userData.email,
              role: userData.role || 'superadmin',
              status: 'already_exists'
            });
          } else {
            console.error(`❌ Error creating admin user ${userData.email}:`, error.message);
            createdUsers.push({
              email: userData.email,
              role: userData.role || 'superadmin',
              status: 'error',
              error: error.message
            });
          }
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Admin users managed successfully',
        deletedCount: deleteResult.deletedCount,
        createdUsers: createdUsers
      });

    } else if (action === 'list') {
      // List all admin users
      const adminUsers = await AdminAuth.find({}).select('-password');
      return NextResponse.json({
        success: true,
        users: adminUsers
      });

    } else if (action === 'delete-all') {
      // Delete all admin users
      const deleteResult = await AdminAuth.deleteMany({});
      return NextResponse.json({
        success: true,
        message: `Deleted ${deleteResult.deletedCount} admin users`,
        deletedCount: deleteResult.deletedCount
      });

    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Use: reset-and-create, list, or delete-all' },
        { status: 400 }
      );
    }

  } catch (error: any) {
    console.error('❌ Error managing admin users:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to manage admin users', details: error.message },
      { status: 500 }
    );
  }
}
