import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('Test file upload endpoint called');
    
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    console.log('Test - File received:', file.name, 'Type:', file.type, 'Size:', file.size);
    
    const fileContent = await file.text();
    console.log('Test - File content:', fileContent.substring(0, 500));
    
    return NextResponse.json({
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      contentPreview: fileContent.substring(0, 500),
      contentLength: fileContent.length
    });
  } catch (error) {
    console.error('Test file upload error:', error);
    return NextResponse.json({ error: 'File upload test failed' }, { status: 500 });
  }
} 