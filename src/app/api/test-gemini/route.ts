import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

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
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    // Test with a simple prompt
    const result = await model.generateContent('Hello, respond with "API is working"');
    const response = await result.response;
    const text = response.text();

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
