import { NextRequest, NextResponse } from 'next/server';
import getConnection from '@/lib/database';
import { createErrorResponse } from '@/lib/db-utils';

export async function POST(request: NextRequest) {
  try {
    await getConnection();
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        {
          success: false,
          message: 'No file provided'
        },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png'
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid file type. Please upload PDF, DOCX, or image files.'
        },
        { status: 400 }
      );
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          success: false,
          message: 'File size too large. Please upload files smaller than 10MB.'
        },
        { status: 400 }
      );
    }

    // Parse the file based on type
    let parsedData;
    
    try {
      if (file.type === 'application/pdf') {
        parsedData = await parsePDF(file);
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        parsedData = await parseDOCX(file);
      } else if (file.type.startsWith('image/')) {
        parsedData = await parseImage(file);
      } else {
        throw new Error('Unsupported file type');
      }
    } catch (parseError) {
      console.error('File parsing error:', parseError);
      return NextResponse.json(
        {
          success: false,
          message: 'Failed to parse file. Please ensure the file is not corrupted and try again.'
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'CV parsed successfully',
      data: {
        parsedData,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      }
    });

  } catch (error: any) {
    console.error('CV parsing error:', error);
    const errorResponse = createErrorResponse(error);
    
    return NextResponse.json(
      errorResponse,
      { status: errorResponse.statusCode || 500 }
    );
  }
}

async function parsePDF(file: File): Promise<any> {
  // This is a mock implementation
  // In production, you would use pdf-parse or similar library
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        personalInfo: {
          firstName: 'Le Hoang',
          lastName: 'Nhi',
          email: 'nhilhto@gmail.com',
          phone: '+84 123 456 789',
          location: 'Ho Chi Minh City, Vietnam',
          linkedin: 'linkedin.com/in/lehoangnhi',
          summary: 'Passionate student with strong academic background in Finance, Law, and Business Management.'
        },
        education: [
          {
            institution: 'University of Economics and Law',
            degree: 'MSc Finance',
            field: 'Finance',
            startDate: '2023',
            endDate: '2025',
            current: true,
            description: 'Advanced studies in financial management and analysis'
          }
        ],
        experience: [
          {
            company: 'Ernst & Young',
            position: 'Intern',
            location: 'Ho Chi Minh City, Vietnam',
            startDate: '2024',
            endDate: '2024',
            current: false,
            description: 'Gained practical experience in professional services and consulting',
            achievements: [
              'Assisted with financial analysis and reporting',
              'Participated in client meetings and presentations'
            ]
          }
        ],
        skills: [
          {
            category: 'Technical Skills',
            skills: ['Financial Analysis', 'Microsoft Excel', 'PowerPoint', 'Data Analysis']
          },
          {
            category: 'Soft Skills',
            skills: ['Communication', 'Teamwork', 'Problem Solving', 'Leadership']
          },
          {
            category: 'Languages',
            skills: ['Vietnamese (Native)', 'English (Fluent)', 'Chinese (Basic)']
          }
        ]
      });
    }, 2000);
  });
}

async function parseDOCX(file: File): Promise<any> {
  // This is a mock implementation
  // In production, you would use mammoth or similar library
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        personalInfo: {
          firstName: 'Le Hoang',
          lastName: 'Nhi',
          email: 'nhilhto@gmail.com',
          phone: '+84 123 456 789',
          location: 'Ho Chi Minh City, Vietnam',
          linkedin: 'linkedin.com/in/lehoangnhi',
          summary: 'Passionate student with strong academic background in Finance, Law, and Business Management.'
        },
        education: [
          {
            institution: 'University of Economics and Law',
            degree: 'MSc Finance',
            field: 'Finance',
            startDate: '2023',
            endDate: '2025',
            current: true,
            description: 'Advanced studies in financial management and analysis'
          }
        ],
        experience: [
          {
            company: 'Ernst & Young',
            position: 'Intern',
            location: 'Ho Chi Minh City, Vietnam',
            startDate: '2024',
            endDate: '2024',
            current: false,
            description: 'Gained practical experience in professional services and consulting',
            achievements: [
              'Assisted with financial analysis and reporting',
              'Participated in client meetings and presentations'
            ]
          }
        ],
        skills: [
          {
            category: 'Technical Skills',
            skills: ['Financial Analysis', 'Microsoft Excel', 'PowerPoint', 'Data Analysis']
          },
          {
            category: 'Soft Skills',
            skills: ['Communication', 'Teamwork', 'Problem Solving', 'Leadership']
          },
          {
            category: 'Languages',
            skills: ['Vietnamese (Native)', 'English (Fluent)', 'Chinese (Basic)']
          }
        ]
      });
    }, 2000);
  });
}

async function parseImage(file: File): Promise<any> {
  // This is a mock implementation
  // In production, you would use Tesseract.js for OCR
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        personalInfo: {
          firstName: 'Le Hoang',
          lastName: 'Nhi',
          email: 'nhilhto@gmail.com',
          phone: '+84 123 456 789',
          location: 'Ho Chi Minh City, Vietnam',
          linkedin: 'linkedin.com/in/lehoangnhi',
          summary: 'Passionate student with strong academic background in Finance, Law, and Business Management.'
        },
        education: [
          {
            institution: 'University of Economics and Law',
            degree: 'MSc Finance',
            field: 'Finance',
            startDate: '2023',
            endDate: '2025',
            current: true,
            description: 'Advanced studies in financial management and analysis'
          }
        ],
        experience: [
          {
            company: 'Ernst & Young',
            position: 'Intern',
            location: 'Ho Chi Minh City, Vietnam',
            startDate: '2024',
            endDate: '2024',
            current: false,
            description: 'Gained practical experience in professional services and consulting',
            achievements: [
              'Assisted with financial analysis and reporting',
              'Participated in client meetings and presentations'
            ]
          }
        ],
        skills: [
          {
            category: 'Technical Skills',
            skills: ['Financial Analysis', 'Microsoft Excel', 'PowerPoint', 'Data Analysis']
          },
          {
            category: 'Soft Skills',
            skills: ['Communication', 'Teamwork', 'Problem Solving', 'Leadership']
          },
          {
            category: 'Languages',
            skills: ['Vietnamese (Native)', 'English (Fluent)', 'Chinese (Basic)']
          }
        ]
      });
    }, 3000); // OCR takes longer
  });
} 