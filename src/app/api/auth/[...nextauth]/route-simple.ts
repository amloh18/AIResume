import NextAuth from 'next-auth'
import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'

/**
 * Simplified NextAuth Route Handler
 * Minimal configuration to resolve the split error
 */

const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET || 'fallback-secret-key-for-development',
  providers: [
    CredentialsProvider({
      id: 'admin-credentials',
      name: 'Admin Login',
      credentials: {
        email: { label: 'Admin Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // Simple admin check for testing
        if (credentials.email === 'admin@cvcircle.io' && credentials.password === 'admin123') {
          return {
            id: 'admin-1',
            email: 'admin@cvcircle.io',
            name: 'Admin User',
            role: 'superadmin',
            type: 'admin',
          };
        }

        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.type = user.type;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.type = token.type as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/admin/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
  },
  debug: process.env.NODE_ENV === 'development',
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST }
