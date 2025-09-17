import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'

let handler: any;

try {
  handler = NextAuth(authOptions)
} catch (error) {
  console.error('❌ NextAuth initialization error:', error)
  
  // Fallback handler that returns an error
  handler = async (req: Request) => {
    return new Response(
      JSON.stringify({ 
        error: 'Authentication service unavailable',
        message: 'Please check server configuration'
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

export const GET = handler
export const POST = handler
