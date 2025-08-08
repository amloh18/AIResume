import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/database';
import Template from '@/models/Template';

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

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || (session.user as any)?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    const templateData = await request.json();
    const templateId = params.id;

    console.log('🔄 Updating template:', templateId);
    console.log('📝 Update data:', JSON.stringify(templateData, null, 2));

    // Extract CV data if templateData field is being updated
    const updateData = { ...templateData, updatedAt: new Date() };
    if (templateData.templateData) {
      updateData.templateData = extractCVData(templateData.templateData);
    }

    const updatedTemplate = await Template.findByIdAndUpdate(
      templateId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedTemplate) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    console.log('✅ Template updated successfully:', updatedTemplate._id);
    return NextResponse.json(updatedTemplate);
  } catch (error: any) {
    console.error('❌ Error updating template:', error);
    return NextResponse.json(
      { error: 'Failed to update template', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || (session.user as any)?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    const templateId = params.id;

    console.log('🗑️ Deleting template:', templateId);

    const deletedTemplate = await Template.findByIdAndDelete(templateId);

    if (!deletedTemplate) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    console.log('✅ Template deleted successfully:', templateId);
    return NextResponse.json({ message: 'Template deleted successfully' });
  } catch (error: any) {
    console.error('❌ Error deleting template:', error);
    return NextResponse.json(
      { error: 'Failed to delete template', details: error.message },
      { status: 500 }
    );
  }
} 