import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import User from '@/models/User';
import UserSettings from '@/models/UserSettings';
import { createErrorResponse } from '@/lib/db-utils';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { parseCvTailoringMode } from '@/lib/cv-tailoring/tailoringMode';

export async function GET(request: NextRequest) {
  try {
    await getConnection();
    
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Get user profile data
    const user = await User.findById(userId).select('-password -emailVerificationToken -emailVerificationExpires -resetPasswordToken -resetPasswordExpires');
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Get user settings
    let userSettings = await UserSettings.findOne({ userId });

    // Create default settings if they don't exist
    if (!userSettings) {
      userSettings = new UserSettings({
        userId,
        // Default values are set in the schema
      });
      await userSettings.save();
    }

    // Combine user profile and settings data
    const responseData = {
      profile: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        avatar: user.avatar,
        phone: user.phone,
        location: user.location,
        website: user.website,
        linkedin: user.linkedin,
        github: user.github,
        summary: user.summary,
        company: user.company,
        jobTitle: user.jobTitle,
        industry: user.industry,
        experience: user.experience,
        isEmailVerified: user.isEmailVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      },
      settings: {
        // Basic UI settings from User table
        theme: user.settings.theme,
        notifications: user.settings.notifications,
        timezone: user.settings.timezone,
        languagePreference: user.settings?.languagePreference,
        cvTailoringMode: parseCvTailoringMode(user.settings?.cvTailoringMode),
        
        // Detailed settings from UserSettings table
        security: userSettings.security,
        detailedNotifications: userSettings.notifications,
        privacy: userSettings.privacy,
        preferences: userSettings.preferences,
        communication: userSettings.communication,
        advanced: userSettings.advanced
      }
    };

    return NextResponse.json({
      success: true,
      data: responseData
    });

  } catch (error: any) {
    console.error('Get user settings error:', error);
    const errorResponse = createErrorResponse(error);
    
    return NextResponse.json(
      errorResponse,
      { status: errorResponse.statusCode || 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    await getConnection();
    
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const body = await request.json();
    const { profile, settings } = body;

    // Get client IP and user agent for audit trail
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Update user profile data
    if (profile) {
      const allowedProfileFields = [
        'firstName', 'lastName', 'username', 'avatar', 'phone', 
        'location', 'website', 'linkedin', 'github', 'summary',
        'company', 'jobTitle', 'industry', 'experience'
      ];
      
      const profileUpdates: any = {};
      Object.keys(profile).forEach(key => {
        if (allowedProfileFields.includes(key)) {
          profileUpdates[key] = profile[key];
        }
      });

      if (Object.keys(profileUpdates).length > 0) {
        await User.findByIdAndUpdate(userId, profileUpdates);
      }
    }

    // Update basic settings in User table
    if (settings?.theme !== undefined || settings?.notifications || settings?.timezone !== undefined || settings?.languagePreference !== undefined || settings?.cvTailoringMode !== undefined) {
      const basicSettingsUpdates: any = {};
      
      if (settings.theme !== undefined) {
        basicSettingsUpdates['settings.theme'] = settings.theme;
      }
      if (settings.notifications) {
        if (settings.notifications.email !== undefined) {
          basicSettingsUpdates['settings.notifications.email'] = settings.notifications.email;
        }
        if (settings.notifications.push !== undefined) {
          basicSettingsUpdates['settings.notifications.push'] = settings.notifications.push;
        }
      }
      if (settings.timezone !== undefined) {
        basicSettingsUpdates['settings.timezone'] = settings.timezone;
      }
      if (settings.languagePreference !== undefined) {
        basicSettingsUpdates['settings.languagePreference'] = settings.languagePreference;
      }
      if (settings.cvTailoringMode !== undefined) {
        basicSettingsUpdates['settings.cvTailoringMode'] = parseCvTailoringMode(settings.cvTailoringMode);
      }

      if (Object.keys(basicSettingsUpdates).length > 0) {
        await User.findByIdAndUpdate(userId, basicSettingsUpdates);
      }
    }

    // Update detailed settings in UserSettings table
    if (settings?.security || settings?.detailedNotifications || settings?.privacy || 
        settings?.preferences || settings?.communication || settings?.advanced) {
      
      let userSettings = await UserSettings.findOne({ userId });
      
      if (!userSettings) {
        userSettings = new UserSettings({ userId });
      }

      // Update security settings
      if (settings.security) {
        Object.keys(settings.security).forEach(key => {
          if (key !== 'twoFactorSecret' && key !== 'backupCodes' && key !== 'securityQuestions') {
            userSettings.security[key] = settings.security[key];
          }
        });
      }

      // Update detailed notifications
      if (settings.detailedNotifications) {
        Object.keys(settings.detailedNotifications).forEach(key => {
          userSettings.notifications[key] = settings.detailedNotifications[key];
        });
      }

      // Update privacy settings
      if (settings.privacy) {
        Object.keys(settings.privacy).forEach(key => {
          userSettings.privacy[key] = settings.privacy[key];
        });
      }

      // Update preferences
      if (settings.preferences) {
        Object.keys(settings.preferences).forEach(key => {
          if (key === 'cv' && settings.preferences.cv && typeof settings.preferences.cv === 'object') {
            userSettings.preferences.cv = {
              ...(userSettings.preferences.cv || {}),
              ...settings.preferences.cv
            };
            return;
          }
          userSettings.preferences[key] = settings.preferences[key];
        });
      }

      // Update communication settings
      if (settings.communication) {
        Object.keys(settings.communication).forEach(key => {
          userSettings.communication[key] = settings.communication[key];
        });
      }

      // Update advanced settings (excluding sensitive data)
      if (settings.advanced) {
        Object.keys(settings.advanced).forEach(key => {
          if (key !== 'apiAccess' || !settings.advanced[key]?.apiKey) {
            userSettings.advanced[key] = settings.advanced[key];
          }
        });
      }

      // Add audit log entry
      userSettings.auditLog.push({
        action: 'settings_updated',
        timestamp: new Date(),
        ipAddress: clientIP,
        userAgent: userAgent,
        changes: settings
      });

      // Keep only last 100 audit entries
      if (userSettings.auditLog.length > 100) {
        userSettings.auditLog = userSettings.auditLog.slice(-100);
      }

      await userSettings.save();
    }

    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully'
    });

  } catch (error: any) {
    console.error('Update user settings error:', error);
    const errorResponse = createErrorResponse(error);
    
    return NextResponse.json(
      errorResponse,
      { status: errorResponse.statusCode || 500 }
    );
  }
}
