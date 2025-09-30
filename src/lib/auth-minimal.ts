import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import connectDB from '@/lib/database'
import User from '@/models/User'

export const authOptionsMinimal: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
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

      // Handle user creation in database after successful OAuth
      if (account?.provider === 'google') {
        try {
          await connectDB();
          let existingUser = await User.findOne({ email: user.email });

          if (!existingUser) {
            const nameParts = user.name?.split(' ') || ['User'];
            const newUser = new User({
              email: user.email,
              firstName: nameParts[0],
              lastName: nameParts.slice(1).join(' ') || '',
              avatar: user.image,
              isEmailVerified: true,
              role: 'user',
              currentPlanKey: 'free',
              authProvider: 'nextauth',
            });

            await newUser.save();
            console.log('✅ New Google user created with ID:', newUser._id.toString());
            user.id = newUser._id.toString();
          } else {
            existingUser.lastLogin = new Date();
            await existingUser.save();
            console.log('✅ Existing Google user updated with ID:', existingUser._id.toString());
            user.id = existingUser._id.toString();
          }
        } catch (error) {
          console.error('❌ Database error in Google signIn:', error);
          // Don't block authentication for database errors
        }
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
      if (token) {
        session.user.id = token.sub || '';
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