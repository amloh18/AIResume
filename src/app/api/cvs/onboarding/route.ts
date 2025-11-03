import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { CV, Template, User } from '@/models';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import AdminTemplateService from '@/lib/services/adminTemplateService';
import mongoose from 'mongoose';

/**
 * POST /api/cvs/onboarding
 * 
 * Special endpoint for creating master CVs during onboarding
 * Handles both NextAuth and Firebase authentication flows
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Starting onboarding CV creation...');
    
    // Ensure we return JSON content type
    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    
    await getConnection();

    // Try to get auth context from session
    let authContext;
    try {
      const session = await getServerSession(authOptions);
      if (session?.user?.email) {
        // Find user by email or other session identifier
        const user = await User.findOne({ 
          email: session.user.email 
        });
        
        if (user) {
          authContext = {
            mongoUserId: user._id,
            authProviderId: user.authProviderId,
            authProvider: user.authProvider,
            email: user.email
          };
          console.log('✅ Auth context from session:', {
            mongoUserId: authContext.mongoUserId,
            authProvider: authContext.authProvider
          });
        }
      }
    } catch (error) {
      console.log('⚠️ Could not get auth context from session, will try request body:', error);
    }

    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('❌ Failed to parse request body:', parseError);
      return NextResponse.json(
        { success: false, error: 'Invalid JSON in request body' },
        { status: 400, headers }
      );
    }
    
    const { title, cvData, templateId, metadata, authProviderId, authProvider } = body;

    // If no auth context from session, try to resolve from request body
    if (!authContext) {
      if (!authProviderId) {
        console.error('❌ No authentication provided - neither session nor authProviderId');
        return NextResponse.json(
          { success: false, error: 'Authentication required - no session or authProviderId provided' },
          { status: 401, headers }
        );
      }

      // Resolve user from authProviderId
      const user = await User.findOne({ 
        authProviderId,
        authProvider: authProvider || 'firebase'
      });

      if (!user) {
        console.error('❌ User not found in database:', { authProviderId, authProvider });
        return NextResponse.json(
          { success: false, error: 'User not found in database' },
          { status: 404, headers }
        );
      }

      authContext = {
        mongoUserId: user._id,
        authProviderId: user.authProviderId,
        authProvider: user.authProvider,
        email: user.email
      };

      console.log('✅ Resolved auth context from request:', authContext);
    }

    // Validate required fields
    if (!title || !cvData) {
      console.error('❌ Missing required fields:', { hasTitle: !!title, hasCvData: !!cvData });
      return NextResponse.json(
        { success: false, error: 'Title and CV data are required' },
        { status: 400, headers }
      );
    }

    // Get template (use provided or default) from admin database
    let finalTemplateId = templateId;
    if (!finalTemplateId) {
      try {
        const defaultTemplate = await AdminTemplateService.getDefaultTemplate('cv');
        
        if (!defaultTemplate) {
          // Get any available template from admin database
          const availableTemplates = await AdminTemplateService.getFreeTemplates('cv');
          
          if (availableTemplates.length === 0) {
            console.error('❌ No templates available in admin database');
            return NextResponse.json(
              { success: false, error: 'No templates available in admin database' },
              { status: 500, headers }
            );
          }
          
          finalTemplateId = availableTemplates[0].id || availableTemplates[0]._id;
          console.log('🔍 Using first available admin template:', availableTemplates[0].name);
        } else {
          finalTemplateId = defaultTemplate.id || defaultTemplate._id;
          console.log('🔍 Using default admin template:', defaultTemplate.name);
        }
      } catch (templateError) {
        console.error('❌ Error fetching template:', templateError);
        return NextResponse.json(
          { success: false, error: 'Failed to fetch template' },
          { status: 500, headers }
        );
      }
    }

    // Validate template exists in admin database
    try {
      const template = await AdminTemplateService.getTemplateById(finalTemplateId);
      if (!template) {
        console.error('❌ Template not found:', finalTemplateId);
        return NextResponse.json(
          { success: false, error: 'Template not found in admin database' },
          { status: 400, headers }
        );
      }
    } catch (templateError) {
      console.error('❌ Error validating template:', templateError);
      return NextResponse.json(
        { success: false, error: 'Failed to validate template' },
        { status: 500, headers }
      );
    }

    // Create CV with new relational schema
    const cvDoc = {
      userId: authContext.mongoUserId,
      title,
      cvData,
      templateId: finalTemplateId,
      metadata: {
        isMaster: metadata?.isMaster || true, // Default to master for onboarding
        lastModified: new Date(),
        tags: metadata?.tags || ['master-cv', 'onboarding'],
        isPublic: metadata?.isPublic || false,
        viewCount: 0,
        downloadCount: 0,
        ...metadata
      }
    };

    console.log('🔍 Creating CV with data:', {
      userId: cvDoc.userId,
      title: cvDoc.title,
      templateId: cvDoc.templateId,
      isMaster: cvDoc.metadata.isMaster,
      tags: cvDoc.metadata.tags
    });

    try {
      const newCV = new CV(cvDoc);
      await newCV.save();

      console.log('✅ Master CV created successfully:', newCV._id);

      // Populate template data for response
      await newCV.populate('templateId');

      return NextResponse.json({
        success: true,
        message: 'Master CV created successfully',
        data: {
          cv: {
            id: newCV._id,
            title: newCV.title,
            templateId: newCV.templateId,
            metadata: newCV.metadata,
            createdAt: newCV.createdAt,
            updatedAt: newCV.updatedAt
          }
        }
      }, { headers });
    } catch (saveError) {
      console.error('❌ Error saving CV to database:', saveError);
      return NextResponse.json(
        { success: false, error: 'Failed to save CV to database' },
        { status: 500, headers }
      );
    }

  } catch (error: any) {
    console.error('❌ Onboarding CV creation error:', error);
    console.error('❌ Error stack:', error.stack);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to create master CV',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500, headers: new Headers({ 'Content-Type': 'application/json' }) }
    );
  }
}
