import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '@/lib/firebase'
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
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          const userCredential = await signInWithEmailAndPassword(
            auth,
            credentials.email,
            credentials.password
          )

          return {
            id: userCredential.user.uid,
            email: userCredential.user.email,
            name: userCredential.user.displayName,
            image: userCredential.user.photoURL,
          } as any
        } catch (error) {
          console.error('Firebase auth error:', error)
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
        await connectDB();
        
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
        } else if (account?.provider === 'credentials') {
          // Handle Firebase credentials sign-in
          const existingUser = await User.findOne({ firebaseUid: user.id });
          
          if (!existingUser) {
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
            // Update existing user
            existingUser.avatar = user.image || existingUser.avatar;
            existingUser.lastLogin = new Date();
            await existingUser.save();
            console.log('✅ Existing Firebase user updated:', existingUser._id);
            
            // Update the user object with MongoDB ID
            user.id = existingUser._id.toString();
          }
        }
        
        return true;
      } catch (error) {
        console.error('❌ Error in signIn callback:', error);
        return false;
      }
    },
    async session({ session, token }) {
      if (token?.sub) {
        session.user.id = token.sub;
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
