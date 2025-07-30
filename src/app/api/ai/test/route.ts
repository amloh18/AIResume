import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyAnOiNIKp0jVXQeFOYo2Z26Wza8kijf6SA';

export async function GET(request: NextRequest) {
  try {
    // Test the API key by listing available models
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${GEMINI_API_KEY}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Gemini API test error:', errorData);
      return NextResponse.json({ 
        error: 'API key test failed',
        details: errorData,
        status: response.status
      }, { status: 400 });
    }

    const data = await response.json();
    
    return NextResponse.json({
      success: true,
      message: 'API key is valid',
      availableModels: data.models?.map((model: any) => model.name) || [],
      totalModels: data.models?.length || 0
    });

  } catch (error) {
    console.error('API test error:', error);
    return NextResponse.json({ 
      error: 'Failed to test API',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 