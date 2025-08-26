import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/database';
import BetaTester from '@/models/BetaTester';

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const { email, source } = await request.json();

    // Validate email
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { success: false, message: 'Please provide a valid email address' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingTester = await BetaTester.findOne({ email: email.toLowerCase() });
    if (existingTester) {
      return NextResponse.json(
        { success: false, message: 'This email is already registered for beta testing' },
        { status: 409 }
      );
    }

    // Create new beta tester entry
    const betaTester = new BetaTester({
      email: email.toLowerCase(),
      source: source || 'website',
      status: 'pending'
    });

    await betaTester.save();

    return NextResponse.json(
      { 
        success: true, 
        message: 'Thank you for registering your interest! We\'ll be in touch soon.' 
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Beta registration error:', error);
    return NextResponse.json(
      { success: false, message: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    await connectToDatabase();

    const betaTesters = await BetaTester.find({})
      .select('email status source createdAt')
      .sort({ createdAt: -1 })
      .limit(100);

    return NextResponse.json({
      success: true,
      data: betaTesters
    });

  } catch (error) {
    console.error('Beta testers fetch error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch beta testers' },
      { status: 500 }
    );
  }
}
