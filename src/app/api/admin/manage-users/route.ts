import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { User } from '@/models';

export async function POST(request: NextRequest) {
  try {
    await getConnection();

    // Get the request body
    const { action, users } = await request.json();

    if (action === 'reset-and-create') {
      // Create new admin users in the User model
      console.log('👥 Creating new admin users...');
      const createdUsers = [];

      for (const userData of users) {
        try {
          const existingUser = await User.findOne({ email: userData.email });
          
          if (existingUser) {
            existingUser.role = userData.role || 'admin';
            if (userData.password) {
              existingUser.password = userData.password;
            }
            await existingUser.save();
            createdUsers.push({
              email: userData.email,
              role: existingUser.role,
              status: 'updated'
            });
            console.log(`✅ Admin user updated: ${userData.email} (${existingUser.role})`);
          } else {
            const adminUser = new User({
              email: userData.email,
              password: userData.password,
              role: userData.role || 'admin',
              firstName: userData.firstName || 'Admin',
              lastName: userData.lastName || 'User',
              isEmailVerified: true,
            });

            await adminUser.save();
            createdUsers.push({
              email: userData.email,
              role: userData.role || 'admin',
              status: 'created'
            });
            console.log(`✅ Admin user created: ${userData.email} (${userData.role || 'admin'})`);
          }
        } catch (error: any) {
          console.error(`❌ Error creating/updating admin user ${userData.email}:`, error.message);
          createdUsers.push({
            email: userData.email,
            role: userData.role || 'admin',
            status: 'error',
            error: error.message
          });
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Admin users managed successfully',
        createdUsers: createdUsers
      });

    } else if (action === 'list') {
      // List all admin users
      const adminUsers = await User.find({ role: { $in: ['admin', 'superadmin'] } }).select('-password').lean();
      return NextResponse.json({
        success: true,
        users: adminUsers
      });

    } else if (action === 'delete-all') {
      // Delete all admin users
      const deleteResult = await User.deleteMany({ role: { $in: ['admin', 'superadmin'] } });
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
