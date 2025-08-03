import { NextRequest, NextResponse } from 'next/server';

// Import the parsing functions from the CV parse route
// Note: We'll define them locally for testing

export async function POST(request: NextRequest) {
  try {
    console.log('Test parsing endpoint called');
    
    const { text } = await request.json();
    
    if (!text) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    console.log('Test - Parsing text:', text.substring(0, 200) + '...');
    
    // Simple text analysis
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Extract basic info
    const personalInfo = {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      location: '',
      linkedin: '',
      summary: ''
    };
    
    // Extract email
    const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
    if (emailMatch) {
      personalInfo.email = emailMatch[0];
    }
    
    // Extract phone
    const phoneMatch = text.match(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
    if (phoneMatch) {
      personalInfo.phone = phoneMatch[0];
    }
    
    // Extract name from first line
    if (lines.length > 0) {
      const nameParts = lines[0].split(' ');
      if (nameParts.length >= 2) {
        personalInfo.firstName = nameParts[0];
        personalInfo.lastName = nameParts.slice(1).join(' ');
      }
    }
    
    return NextResponse.json({
      personalInfo,
      lines: lines.slice(0, 10),
      textLength: text.length
    });
  } catch (error) {
    console.error('Test parsing error:', error);
    return NextResponse.json({ error: 'Parsing test failed', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
} 