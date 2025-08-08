import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import AppleProvider from 'next-auth/providers/apple';
import CredentialsProvider from 'next-auth/providers/credentials';
import { MongoDBAdapter } from '@auth/mongodb-adapter';
import clientPromise from './mongodb';
import connectDB from './database';
import { User } from '@/models';

// Check if OAuth credentials are configured
const hasGoogleCredentials = process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET;
const hasAppleCredentials = process.env.APPLE_ID && process.env.APPLE_SECRET;

export const authOptions: NextAuthOptions = {
  adapter: MongoDBAdapter(clientPromise) as any,
  providers: [
    // Only add Google provider if credentials are configured
    ...(hasGoogleCredentials ? [
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        profile(profile) {
          return {
            id: profile.sub,
            name: profile.name,
            email: profile.email,
            image: profile.picture,
            firstName: profile.given_name,
            lastName: profile.family_name,
          };
        },
      })
    ] : []),
    // Only add Apple provider if credentials are configured
    ...(hasAppleCredentials ? [
      AppleProvider({
        clientId: process.env.APPLE_ID!,
        clientSecret: process.env.APPLE_SECRET!,
        profile(profile) {
          return {
            id: profile.sub,
            name: profile.name,
            email: profile.email,
            image: profile.image || undefined,
            firstName: profile.name?.firstName,
            lastName: profile.name?.lastName,
          };
        },
      })
    ] : []),
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
          const user = await User.findOne({ email: credentials.email });
          
          if (!user) {
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
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            image: user.avatar,
          };
        } catch (error) {
          console.error('Credentials auth error:', error);
          return null;
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.firstName = user.firstName;
        token.lastName = user.lastName;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.firstName = token.firstName as string;
        session.user.lastName = token.lastName as string;
        session.user.role = token.role as string;
      }
      return session;
    },
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google' || account?.provider === 'apple') {
        try {
          await connectDB();
          
          // Check if user already exists
          const existingUser = await User.findOne({ email: user.email });
          
          if (!existingUser) {
            // Create new user from OAuth
            const newUser = new User({
              email: user.email,
              firstName: user.firstName || user.name?.split(' ')[0] || 'User',
              lastName: user.lastName || user.name?.split(' ').slice(1).join(' ') || '',
              avatar: user.image,
              isEmailVerified: true, // OAuth users are pre-verified
              subscription: {
                plan: 'basic',
                status: 'active',
                startDate: new Date(),
                seats: 3,
                storageUsed: 0
              },
              settings: {
                theme: 'auto',
                notifications: {
                  email: true,
                  push: true
                }
              }
            });
            
            await newUser.save();
          }
          
          return true;
        } catch (error) {
          console.error('OAuth sign in error:', error);
          return false;
        }
      }
      
      return true;
    }
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
}; 