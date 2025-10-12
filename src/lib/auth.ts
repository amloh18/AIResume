import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import EmailProvider from 'next-auth/providers/email'
import CredentialsProvider from 'next-auth/providers/credentials'
import connectDB from '@/lib/database'
import User from '@/models/User'
import { verifyFirebaseToken } from '@/lib/firebase-admin'

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
      id: 'firebase',
      name: 'Firebase',
      credentials: {
        idToken: { label: "Firebase ID Token", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.idToken) {
          return null;
        }

        try {
          // Verify Firebase ID token
          const decodedToken = await verifyFirebaseToken(credentials.idToken);
          
          if (!decodedToken) {
            console.error('❌ Firebase token verification failed');
            return null;
          }

          await connectDB();
          
          // Find or create user in MongoDB
          let user = await User.findOne({ firebaseUid: decodedToken.uid });
          
          if (!user) {
            // Create new user if not found
            user = new User({
              firebaseUid: decodedToken.uid,
              email: decodedToken.email,
              firstName: decodedToken.name?.split(' ')[0] || 'User',
              lastName: decodedToken.name?.split(' ').slice(1).join(' ') || '',
              isEmailVerified: decodedToken.email_verified || false,
              authProvider: 'firebase',
              role: 'user',
              currentPlanKey: 'free',
              monthlyGoal: 20,
              usage: {
                cvJourneyCount: 0,
                cvCreatedCount: 0,
                journeysCreated: 0,
                exportCount: 0,
                atsCheckCount: 0,
                lastResetDate: new Date(),
              },
              subscription: {
                planKey: 'free',
                status: 'inactive',
                startDate: new Date(),
                provider: 'stripe',
                interval: 'monthly',
                seats: 3,
                storageUsed: 0,
              },
              settings: {
                theme: 'auto',
                notifications: {
                  email: true,
                  push: true,
                },
                timezone: 'UTC',
                languagePreference: 'en',
              },
              lastLogin: new Date(),
            });
            
            await user.save();
            console.log('✅ New Firebase user created:', user._id);
          } else {
            // Update last login for existing user
            user.lastLogin = new Date();
            await user.save();
          }

          return {
            id: user._id.toString(),
            email: user.email,
            name: `${user.firstName} ${user.lastName}`,
          };
        } catch (error) {
          console.error('Firebase authorization error:', error);
          return null;
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
            role: user.role,
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
              authProviderId: user.id, // Use NextAuth user ID as authProviderId
              monthlyGoal: 20,
              usage: {
                cvJourneyCount: 0,
                cvCreatedCount: 0,
                journeysCreated: 0,
                exportCount: 0,
                atsCheckCount: 0,
                lastResetDate: new Date(),
              },
              subscription: {
                planKey: 'free',
                status: 'inactive',
                startDate: new Date(),
                provider: 'stripe',
                interval: 'monthly',
                seats: 3,
                storageUsed: 0,
              },
              settings: {
                theme: 'auto',
                notifications: {
                  email: true,
                  push: true,
                },
                timezone: 'UTC',
                languagePreference: 'en',
              },
              lastLogin: new Date(),
            });

            await newUser.save();
            console.log('✅ New Google user created with ID:', newUser._id.toString());
            user.id = newUser._id.toString();
          } else {
            // Update existing user with Google auth provider if not set
            if (!existingUser.authProvider) {
              existingUser.authProvider = 'nextauth';
            }
            if (!existingUser.authProviderId) {
              existingUser.authProviderId = user.id;
            }
            existingUser.avatar = user.image || existingUser.avatar;
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
        token.role = user.role; // Store role in token
      }
      return token;
    },
    
    async session({ session, token }) {
      if (token?.sub) {
        session.user.id = token.sub;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        
        // Use role from token if available, otherwise fetch from database
        if (token.role) {
          session.user.role = token.role;
          console.log('🔍 Session user role from token:', token.role);
        } else {
          // Fetch user role from database
          try {
            await connectDB();
            const user = await User.findOne({ email: token.email as string });
            if (user) {
              session.user.role = user.role;
              console.log('🔍 Session user role from database:', user.role);
            } else {
              session.user.role = 'user'; // Default to user role
            }
          } catch (error) {
            console.error('❌ Error fetching user role for session:', error);
            session.user.role = 'user'; // Default to user role
          }
        }
      }
      return session;
    },
  },
  session: {
    strategy: 'jwt',
  },
  debug: true
}
