import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Testing NextAuth Configuration...');

    // Check environment variables
    const envCheck = {
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'NOT SET',
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? 'SET' : 'NOT SET',
      MONGODB_URI: process.env.MONGODB_URI ? 'SET' : 'NOT SET',
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'NOT SET',
    };

    console.log('Environment variables:', envCheck);

    // Check if required variables are missing
    const requiredVars = [
      'NEXTAUTH_URL',
      'NEXTAUTH_SECRET',
      'MONGODB_URI',
      'NEXT_PUBLIC_FIREBASE_PROJECT_ID'
    ];

    const missingVars = requiredVars.filter(varName => !process.env[varName]);

    // Test Firebase Admin SDK
    let firebaseStatus = 'NOT TESTED';
    try {
      const admin = require('firebase-admin');
      firebaseStatus = 'LOADED';
      
      if (admin.apps.length > 0) {
        firebaseStatus = 'INITIALIZED';
      } else {
        firebaseStatus = 'NOT INITIALIZED';
      }
    } catch (error) {
      firebaseStatus = `ERROR: ${error.message}`;
    }

    // Test MongoDB connection
    let mongoStatus = 'NOT TESTED';
    try {
      const mongoose = require('mongoose');
      mongoStatus = 'LOADED';
      
      // Try to connect
      if (mongoose.connection.readyState === 1) {
        mongoStatus = 'CONNECTED';
      } else {
        mongoStatus = 'NOT CONNECTED';
      }
    } catch (error) {
      mongoStatus = `ERROR: ${error.message}`;
    }

    const result = {
      success: true,
      environment: envCheck,
      missingVars,
      firebaseStatus,
      mongoStatus,
      timestamp: new Date().toISOString()
    };

    console.log('NextAuth test result:', result);

    return NextResponse.json(result);
  } catch (error) {
    console.error('NextAuth test error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
