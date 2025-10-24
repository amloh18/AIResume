import NextAuth from 'next-auth'
import { authOptionsMinimal } from '@/lib/auth-minimal'

// Add error handling and validation
let handler: any

try {
  // Validate auth options before creating handler
  if (!authOptionsMinimal) {
    throw new Error('Auth options are undefined')
  }
  
  if (!authOptionsMinimal.secret) {
    throw new Error('NEXTAUTH_SECRET is not defined')
  }
  
  handler = NextAuth(authOptionsMinimal)
} catch (error) {
  console.error('NextAuth configuration error:', error)
  // Create a minimal fallback handler
  handler = NextAuth({
    secret: process.env.NEXTAUTH_SECRET || 'fallback-secret',
    providers: [],
    pages: {
      signIn: '/sign-in',
      error: '/auth/error',
    }
  })
}

export { handler as GET, handler as POST }
