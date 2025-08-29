import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/database';
import BetaSignup from '@/models/BetaSignup';

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const { email } = await request.json();

    // Validate email
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingSignup = await BetaSignup.findOne({ email: email.toLowerCase() });
    if (existingSignup) {
      return NextResponse.json(
        { error: 'This email is already registered for beta access' },
        { status: 409 }
      );
    }

    // Create new beta signup
    const betaSignup = new BetaSignup({
      email: email.toLowerCase(),
      status: 'pending'
    });

    await betaSignup.save();

    return NextResponse.json(
      { 
        message: 'Thank you for your interest! We\'ll be in touch soon.',
        success: true 
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Beta signup error:', error);
    
    // Handle duplicate key error
    if ((error as any).code === 11000) {
      return NextResponse.json(
        { error: 'This email is already registered for beta access' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    await connectToDatabase();
    
    const signups = await BetaSignup.find({})
      .sort({ createdAt: -1 })
      .select('email status createdAt')
      .limit(100);

    return NextResponse.json({ signups });
  } catch (error) {
    console.error('Error fetching beta signups:', error);
    return NextResponse.json(
      { error: 'Failed to fetch beta signups' },
      { status: 500 }
    );
  }
}
