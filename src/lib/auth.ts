import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { verifyFirebaseToken } from '@/lib/firebase-admin'
import connectDB from '@/lib/database'
import User from '@/models/User'

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET || 'fallback-secret-for-development',
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
    CredentialsProvider({
      id: 'firebase',
      name: 'Firebase',
      credentials: {
        idToken: { label: 'Firebase ID Token', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.idToken) {
          console.log('❌ No Firebase ID token provided');
          return null
        }

        try {
          console.log('🔍 Verifying Firebase ID token...');
          // Verify Firebase ID token
          const decodedToken = await verifyFirebaseToken(credentials.idToken)
          console.log('✅ Firebase token verified successfully:', {
            uid: decodedToken.uid,
            email: decodedToken.email,
            name: decodedToken.name
          });
          
          const userData = {
            id: decodedToken.uid,
            email: decodedToken.email,
            name: decodedToken.name || decodedToken.email?.split('@')[0] || 'User',
            image: decodedToken.picture,
          };
          
          console.log('👤 Returning user data:', userData);
          return userData as any
        } catch (error) {
          console.error('❌ Firebase token verification error:', error)
          return null
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
          console.log('❌ Credentials provider: Missing email or password');
          return null
        }

        try {
          console.log('🔍 Credentials provider: Attempting Firebase sign-in for:', credentials.email);
          const userCredential = await signInWithEmailAndPassword(
            auth,
            credentials.email,
            credentials.password
          )

          console.log('✅ Credentials provider: Firebase sign-in successful:', {
            uid: userCredential.user.uid,
            email: userCredential.user.email,
            displayName: userCredential.user.displayName
          });

          const userData = {
            id: userCredential.user.uid,
            email: userCredential.user.email,
            name: userCredential.user.displayName,
            image: userCredential.user.photoURL,
          };

          console.log('👤 Credentials provider: Returning user data:', userData);
          return userData as any
        } catch (error) {
          console.error('❌ Credentials provider: Firebase auth error:', error)
          return null
        }
      }
    }),
  ],
  pages: {
    signIn: '/sign-in',
    error: '/auth/error',
    verifyRequest: '/auth/verify-request',
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        console.log('🔍 NextAuth signIn callback triggered:', {
          userId: user.id,
          userEmail: user.email,
          userName: user.name,
          provider: account?.provider,
          accountId: account?.providerAccountId
        });
        
        console.log('🔌 Connecting to database...');
        await connectDB();
        console.log('✅ Database connected successfully');
        
        if (account?.provider === 'google') {
          // Handle Google OAuth sign-in
          const existingUser = await User.findOne({ email: user.email });
          
          if (!existingUser) {
            // Create new user for Google OAuth
            const newUser = new User({
              email: user.email,
              firstName: user.name?.split(' ')[0] || 'User',
              lastName: user.name?.split(' ').slice(1).join(' ') || '',
              avatar: user.image,
              isEmailVerified: true, // Google OAuth users are pre-verified
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
                timezone: 'UTC +07:00 - Asia / Jakarta',
                languagePreference: 'English',
              },
              lastLogin: new Date(),
            });
            
            await newUser.save();
            console.log('✅ New Google OAuth user created:', newUser._id);
            
            // Update the user object with MongoDB ID
            user.id = newUser._id.toString();
          } else {
            // Update existing user
            existingUser.avatar = user.image || existingUser.avatar;
            existingUser.lastLogin = new Date();
            await existingUser.save();
            console.log('✅ Existing Google OAuth user updated:', existingUser._id);
            
            // Update the user object with MongoDB ID
            user.id = existingUser._id.toString();
          }
        } else if (account?.provider === 'firebase' || account?.provider === 'credentials') {
          // Handle Firebase sign-in (both firebase provider and credentials provider)
          console.log('🔥 Handling Firebase sign-in for user:', user.id, 'via provider:', account?.provider);
          const existingUser = await User.findOne({ firebaseUid: user.id });
          
          if (!existingUser) {
            console.log('👤 Creating new Firebase user in MongoDB...');
            // Create new user for Firebase auth
            const newUser = new User({
              firebaseUid: user.id,
              email: user.email,
              firstName: user.name?.split(' ')[0] || 'User',
              lastName: user.name?.split(' ').slice(1).join(' ') || '',
              avatar: user.image,
              isEmailVerified: true,
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
                timezone: 'UTC +07:00 - Asia / Jakarta',
                languagePreference: 'English',
              },
              lastLogin: new Date(),
            });
            
            await newUser.save();
            console.log('✅ New Firebase user created:', newUser._id);
            
            // Update the user object with MongoDB ID
            user.id = newUser._id.toString();
          } else {
            console.log('👤 Updating existing Firebase user:', existingUser._id);
            // Update existing user
            existingUser.avatar = user.image || existingUser.avatar;
            existingUser.lastLogin = new Date();
            await existingUser.save();
            console.log('✅ Existing Firebase user updated:', existingUser._id);
            
            // Update the user object with MongoDB ID
            user.id = existingUser._id.toString();
          }
        }
        
        console.log('✅ signIn callback completed successfully');
        return true;
      } catch (error) {
        console.error('❌ Error in signIn callback:', error);
        console.error('❌ Error stack:', error.stack);
        return false;
      }
    },
    async session({ session, token }) {
      if (token?.sub) {
        session.user.id = token.sub;
        
        // Fetch user role from database
        try {
          await connectDB();
          
          // Try to find user by MongoDB ID first, then by email
          let user = await User.findById(token.sub).select('role email firstName lastName');
          
          if (!user && session.user?.email) {
            // If not found by ID, try by email
            user = await User.findOne({ email: session.user.email }).select('role email firstName lastName');
            if (user) {
              // Update the session user ID to match the database
              session.user.id = user._id.toString();
            }
          }
          
          if (user) {
            session.user.role = user.role;
            session.user.email = user.email;
            session.user.name = `${user.firstName} ${user.lastName}`;
            console.log('✅ Session callback: User role fetched:', user.role);
          } else {
            console.log('❌ Session callback: User not found in database');
          }
        } catch (error) {
          console.error('Error fetching user role in session callback:', error);
        }
      }
      return session;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
    async redirect({ url, baseUrl }) {
      // Redirect to dashboard after successful sign-in
      if (url.startsWith('/')) return `${baseUrl}${url}`
      else if (new URL(url).origin === baseUrl) return url
      return `${baseUrl}/dashboard`
    },
  },
  session: {
    strategy: 'jwt',
  },
  debug: process.env.NODE_ENV === 'development',
}
