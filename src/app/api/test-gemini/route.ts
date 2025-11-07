import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing Gemini API connection...');
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'GEMINI_API_KEY not found in environment variables'
      }, { status: 500 });
    }

    console.log('🔑 API Key found:', apiKey.substring(0, 10) + '...');

    // Initialize Gemini AI
    const genAI = new GoogleGenAI({ apiKey });
    
    // Test with a simple prompt
    const result = await genAI.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents: 'Hello, respond with "API is working"'
    });
    const text = result.text || '';

    console.log('✅ Gemini API test successful:', text);

    return NextResponse.json({
      success: true,
      message: 'Gemini API is working correctly',
      response: text,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Gemini API test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 });
  }
}
