import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import EmailProvider from 'next-auth/providers/email'
import CredentialsProvider from 'next-auth/providers/credentials'
import connectDB from '@/lib/database'
import User from '@/models/User'

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    EmailProvider({
      server: process.env.EMAIL_SERVER_HOST + ':' + process.env.EMAIL_SERVER_PORT,
      from: process.env.EMAIL_SERVER_USER,
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          await connectDB();
          const user = await User.findOne({ email: credentials.email }).select('+password');

          if (!user || !user.password) {
            return null;
          }

          const isPasswordValid = await user.comparePassword(credentials.password);
          if (!isPasswordValid) {
            return null;
          }

          return {
            id: user._id.toString(),
            email: user.email,
            name: `${user.firstName} ${user.lastName}`,
          };
        } catch (error) {
          console.error('Credentials authorization error:', error);
          return null;
        }
      }
    }),
  ],
  pages: {
    signIn: '/sign-in',
    error: '/auth/error',
  },
  callbacks: {
    async signIn({ user, account }) {
      console.log('🔍 SignIn callback:', { provider: account?.provider, email: user.email });
      
      // Skip database operations for now to test OAuth flow
      if (account?.provider === 'google') {
        console.log('✅ Google OAuth sign-in allowed');
        return true;
      }
      
      if (account?.provider === 'email') {
        console.log('✅ Email sign-in allowed');
        return true;
      }
      
      if (account?.provider === 'credentials') {
        console.log('✅ Credentials sign-in allowed');
        return true;
      }
      
      return true;
    },
    
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },
    
    async session({ session, token }) {
      if (token?.sub) {
        session.user.id = token.sub;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
      }
      return session;
    },
  },
  session: {
    strategy: 'jwt',
  },
  debug: true,
}
