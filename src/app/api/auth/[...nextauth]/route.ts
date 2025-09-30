import NextAuth from 'next-auth'
import { authOptionsMinimal } from '@/lib/auth-minimal'

const handler = NextAuth(authOptionsMinimal)

export { handler as GET, handler as POST }
