import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import getConnection from '@/lib/database'
import User from '@/models/User'

export const authOptionsMinimal: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
  providers: [
    GoogleProvider({
      clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        console.log('🔍 Credentials authorize called with:', { email: credentials?.email });

        if (!credentials?.email || !credentials?.password) {
          console.log('❌ Missing credentials');
          return null;
        }

        try {
          await getConnection();
          console.log('🔍 Database connected, searching for user:', credentials.email);

          const user = await User.findOne({ email: credentials.email }).select('+password');
          console.log('🔍 User found:', { found: !!user, hasPassword: !!user?.password });

          if (!user || !user.password) {
            console.log('❌ User not found or no password set');
            return null;
          }

          const isPasswordValid = await user.comparePassword(credentials.password);
          console.log('🔍 Password validation result:', isPasswordValid);

          if (!isPasswordValid) {
            console.log('❌ Invalid password');
            return null;
          }

          console.log('✅ Credentials valid for user:', user.email);
          return {
            id: user._id.toString(),
            email: user.email,
            name: `${user.firstName} ${user.lastName}`,
          };
        } catch (error) {
          console.error('❌ Credentials authorization error:', error);
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
    async signIn({ user, account, profile }) {
      console.log('🔍 SignIn callback:', {
        provider: account?.provider,
        email: user.email,
        account: account,
        profile: profile
      });

      // Handle user creation in database after successful OAuth
      if (account?.provider === 'google') {
        try {
          await getConnection();
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

      // For credentials provider, user.id should already be set
      if (account?.provider === 'credentials') {
        console.log('✅ Credentials sign-in successful for user:', user.email);
      }

      return true;
    },

    async jwt({ token, user, trigger }) {
      if (user) {
        token.sub = user.id;
        token.email = user.email;
        token.name = user.name;
      }

      // Refresh currentPlanKey from database on every session access
      // This ensures plan changes take effect immediately
      if (token.sub) {
        try {
          await getConnection();
          const dbUser = await User.findById(token.sub).select('currentPlanKey').lean();
          token.currentPlanKey = (dbUser as any)?.currentPlanKey || 'free';
        } catch (error) {
          console.error('Error fetching currentPlanKey:', error);
          token.currentPlanKey = 'free';
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub || '';
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        (session.user as any).currentPlanKey = token.currentPlanKey || 'free';
      }
      return session;
    },
  },
  session: {
    strategy: 'jwt',
  },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production'
        ? '__Secure-next-auth.session-token'
        : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'none',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        domain: process.env.NODE_ENV === 'production' ? '.cvcircle.io' : undefined,
      },
    },
    callbackUrl: {
      name: process.env.NODE_ENV === 'production'
        ? '__Secure-next-auth.callback-url'
        : 'next-auth.callback-url',
      options: {
        httpOnly: true,
        sameSite: 'none',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        domain: process.env.NODE_ENV === 'production' ? '.cvcircle.io' : undefined,
      },
    },
    csrfToken: {
      name: process.env.NODE_ENV === 'production'
        ? '__Secure-next-auth.csrf-token'
        : 'next-auth.csrf-token',
      options: {
        httpOnly: true,
        sameSite: 'none',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        domain: process.env.NODE_ENV === 'production' ? '.cvcircle.io' : undefined,
      },
    },
  },
  useSecureCookies: process.env.NODE_ENV === 'production',
}