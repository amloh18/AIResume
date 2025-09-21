import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
// Removed - using Clerk now

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { content, type } = await request.json();

    if (!content || !type) {
      return NextResponse.json({ error: 'Content and type are required' }, { status: 400 });
    }

    // For now, return a simple enhancement of the content
    // In a real implementation, this would call an AI service like OpenAI
    let refinedContent = content;

    if (type === 'resume_bullets') {
      // Simple enhancement - in production, this would use AI
      refinedContent = content
        .split('\n')
        .map(line => {
          if (line.trim()) {
            // Add action verbs if not present
            if (!line.match(/^(Led|Managed|Developed|Created|Implemented|Improved|Increased|Reduced|Optimized|Designed|Built|Established|Coordinated|Supervised|Analyzed|Resolved|Delivered|Achieved|Generated|Streamlined)/i)) {
              line = '• ' + line.replace(/^[•\-\*]\s*/, '');
            } else {
              line = '• ' + line.replace(/^[•\-\*]\s*/, '');
            }
          }
          return line;
        })
        .join('\n');
    }

    return NextResponse.json({ 
      success: true, 
      refinedContent 
    });

  } catch (error) {
    console.error('Error refining content:', error);
    return NextResponse.json(
      { error: 'Failed to refine content' },
      { status: 500 }
    );
  }
}
