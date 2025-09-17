import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
// Removed - using Clerk now
import connectDB from '@/lib/database';
import { Template } from '@/models';

// Add better error handling and logging
const logError = (error: any, context: string) => {
  console.error(`❌ ${context}:`, error);
  if (error.name) console.error('Error name:', error.name);
  if (error.message) console.error('Error message:', error.message);
  if (error.stack) console.error('Error stack:', error.stack);
  if (error.errors) console.error('Validation errors:', error.errors);
};

// Extract CV data from template data
const extractCVData = (data: any): any => {
  // If data already contains CV fields, return it
  if (data.personalInfo || data.experience || data.education || data.skills || data.projects) {
    return data;
  }

  // If data contains template metadata, extract only CV data
  const cvDataKeys = ['personalInfo', 'experience', 'education', 'skills', 'projects', 'certifications', 'languages'];
  const cvData: any = {};
  
  cvDataKeys.forEach(key => {
    if (data[key]) {
      cvData[key] = data[key];
    }
  });
  
  // If we found CV data, return it
  if (Object.keys(cvData).length > 0) {
    return cvData;
  }

  // Return default CV data if no CV data found
  return {
    personalInfo: {
      name: 'John Doe',
      email: 'john.doe@example.com',
      phone: '+1 (555) 123-4567',
      location: 'San Francisco, CA',
      title: 'Professional',
      summary: 'Experienced professional with expertise in various domains.'
    },
    experience: [{
      company: 'Company Name',
      position: 'Job Title',
      duration: '2020 - Present',
      description: 'Job description and responsibilities.'
    }],
    education: [{
      institution: 'University Name',
      degree: 'Degree Title',
      duration: '2016 - 2020',
      description: 'Educational achievements and focus areas.'
    }],
    skills: ['Skill 1', 'Skill 2', 'Skill 3', 'Skill 4', 'Skill 5'],
    projects: [{
      name: 'Project Name',
      description: 'Project description and outcomes.',
      technologies: 'Technologies used'
    }]
  };
};

export async function GET(request: NextRequest) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const templates = await Template.find({}).sort({ createdAt: -1 });

    return NextResponse.json(templates);
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Starting template creation...');
    
    // Check authentication and admin role
    const session = await getServerSession(authOptions);
    console.log('👤 Session:', session ? { user: session.user?.email, role: session.user?.role } : 'No session');
    
    if (!session || session.user?.role !== 'admin') {
      console.log('❌ Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔌 Connecting to database...');
    await connectDB();
    console.log('✅ Database connected');

    const templateData = await request.json();
    console.log('📝 Received template data:', JSON.stringify(templateData, null, 2));

    // Set createdBy to the current admin user
    templateData.createdBy = session.user?.id;
    console.log('👤 Set createdBy to:', session.user?.id);

    // Ensure required fields are present
    if (!templateData.name && !templateData.templateName) {
      console.log('❌ Missing template name');
      return NextResponse.json({ error: 'Template name is required' }, { status: 400 });
    }

    // Normalize the template data structure
    const normalizedTemplateData = {
      name: templateData.name || templateData.templateName,
      description: templateData.description || templateData.templateName,
      category: templateData.category || 'cv',
      categories: templateData.categories || [],
      tier: templateData.tier || 'free',
      globalStyles: templateData.globalStyles || {
        fontFamily: templateData.style?.fontFamily || 'Inter, system-ui, sans-serif',
        primaryColor: '#2563eb',
        secondaryColor: '#64748b',
        backgroundColor: '#ffffff',
        fontSize: '12pt',
        lineHeight: '1.6',
        spacing: '24px',
        borderRadius: '8px',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
      },
      availableSections: templateData.availableSections || [],
      templateData: templateData.templateData || extractCVData(templateData),
      isPublished: templateData.isPublished || false,
      globalAccess: templateData.globalAccess || true,
      isActive: templateData.isActive || true,
      isDefault: templateData.isDefault || false,
      createdBy: templateData.createdBy
    };

    // Validate and fix category field
    const validCategories = ['cv', 'portfolio', 'cover-letter', 'resume', 'custom'];
    if (!validCategories.includes(normalizedTemplateData.category)) {
      console.log(`⚠️ Invalid category '${normalizedTemplateData.category}', defaulting to 'cv'`);
      normalizedTemplateData.category = 'cv';
    }

    // Ensure categories array contains valid values
    const validCategoryTags = ['Creative', 'Professional', 'Modern'];
    if (normalizedTemplateData.categories && Array.isArray(normalizedTemplateData.categories)) {
      normalizedTemplateData.categories = normalizedTemplateData.categories.filter(cat => 
        validCategoryTags.includes(cat)
      );
    }

    // If no categories are provided, add a default one based on the main category
    if (!normalizedTemplateData.categories || normalizedTemplateData.categories.length === 0) {
      console.log('⚠️ No categories provided, adding default category');
      normalizedTemplateData.categories = ['Professional'];
    }

    console.log('📝 Creating template with normalized data:', JSON.stringify(normalizedTemplateData, null, 2));

    const template = new Template(normalizedTemplateData);
    console.log('✅ Template instance created');
    
    const savedTemplate = await template.save();
    console.log('✅ Template saved successfully:', savedTemplate._id);

    return NextResponse.json(savedTemplate, { status: 201 });
  } catch (error) {
    logError(error, 'Template creation failed');
    
    // Handle mongoose validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message);
      console.log('❌ Validation errors:', validationErrors);
      return NextResponse.json(
        { error: 'Validation failed', details: validationErrors },
        { status: 400 }
      );
    }

    // Handle other specific errors
    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'Template with this name already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create template', details: error.message },
      { status: 500 }
    );
  }
} 