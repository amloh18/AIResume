import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import connectDB from './database';
import { User } from '@/models';
import { verifyFirebaseToken, getFirebaseUser } from './firebase-admin';

export const authOptions: NextAuthOptions = {
  // IMPORTANT: When using CredentialsProvider, you do NOT use the NextAuth adapter
  // Database interaction is handled manually within the `authorize` function
  // This ensures proper Firebase + MongoDB integration
  
  providers: [
    // Firebase Authentication Provider (Primary)
    CredentialsProvider({
      id: 'firebase',
      name: 'Firebase',
      credentials: {
        idToken: { label: "Firebase ID Token", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.idToken) {
          console.log('❌ NextAuth - No ID token provided');
          return null;
        }

        try {
          console.log('🔍 NextAuth - Starting Firebase token verification');
          
          // 1. Verify the Firebase ID token using Firebase Admin SDK
          const decodedToken = await verifyFirebaseToken(credentials.idToken);
          const { uid, email, name, picture, email_verified } = decodedToken;
          
          console.log('🔍 NextAuth - Firebase token verified:', { 
            uid, 
            email, 
            name, 
            email_verified 
          });

          if (!email) {
            console.log('❌ NextAuth - No email in token');
            return null;
          }

          // 2. Connect to MongoDB database
          console.log('🔍 NextAuth - Connecting to database');
          await connectDB();
          console.log('✅ NextAuth - Database connected');

          // 3. Find or create user in MongoDB based on Firebase UID
          console.log('🔍 NextAuth - Looking for user with Firebase UID:', uid);
          let user = await User.findOne({ firebaseUid: uid });
          console.log('🔍 NextAuth - User found:', !!user);

          if (!user) {
            // User doesn't exist, create a new user profile
            console.log('🔍 NextAuth - Creating new user profile');
            console.log('Creating user profile during NextAuth signin for UID:', uid);
            
            try {
              console.log('🔍 NextAuth - Creating new user with data:', {
                firebaseUid: uid,
                email: email,
                firstName: 'User',
                lastName: 'User',
                isEmailVerified: email_verified
              });

              user = new User({
                firebaseUid: uid,
                email: email,
                firstName: 'User', // Default values, can be updated later
                lastName: 'User', // Default value, can be updated later
                isEmailVerified: email_verified,
                role: 'user',
                currentPlanKey: 'free',
                monthlyGoal: 20,
                usage: {
                  cvJourneyCount: 0,
                  cvCreatedCount: 0,
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

              console.log('🔍 NextAuth - User object created, attempting to save...');
              await user.save();
              console.log('✅ NextAuth - User profile created successfully:', user._id);
            } catch (userCreationError: any) {
              console.error('❌ NextAuth - User creation failed:', userCreationError);
              console.error('❌ NextAuth - User creation error details:', {
                message: userCreationError.message,
                name: userCreationError.name,
                errors: userCreationError.errors
              });
              throw userCreationError; // Re-throw to be caught by outer catch
            }
          }

          // Update last login
          try {
            console.log('🔍 NextAuth - Updating last login for user:', user._id);
            user.lastLogin = new Date();
            await user.save();
            console.log('✅ NextAuth - Last login updated successfully');
          } catch (updateError) {
            console.error('❌ NextAuth - Failed to update last login:', updateError);
            // Don't throw here, just log the error and continue
          }

          // 4. Return user object from MongoDB in NextAuth format
          // This object will be passed to the JWT callback
          // Ensure it has an 'id' property for NextAuth
          console.log('🔍 NextAuth - Returning user data for NextAuth session');
          const userData = {
            id: user._id.toString(), // MongoDB user ID (required by NextAuth)
            firebaseUid: user.firebaseUid, // Firebase UID for reference
            email: user.email,
            name: `${user.firstName} ${user.lastName}`,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            image: user.avatar,
            emailVerified: email_verified || false
          };
          
          console.log('✅ NextAuth - User data prepared:', {
            id: userData.id,
            firebaseUid: userData.firebaseUid,
            email: userData.email,
            name: userData.name,
            role: userData.role
          });
          
          return userData;
        } catch (error: any) {
          console.error('❌ NextAuth - Firebase authorization error:', error);
          console.error('❌ NextAuth - Error details:', {
            message: error?.message || 'Unknown error',
            stack: error?.stack || 'No stack trace',
            name: error?.name || 'Unknown error type'
          });
          return null;
        }
      }
    })
  ],

  callbacks: {
    // This callback puts your custom data into the JWT
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id; // MongoDB user ID
        token.firebaseUid = (user as any).firebaseUid; // Firebase UID
        token.firstName = (user as any).firstName;
        token.lastName = (user as any).lastName;
        token.role = (user as any).role;
        token.emailVerified = (user as any).emailVerified;
      }
      return token;
    },
    // This callback makes the data available to the client-side `useSession` hook
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string; // MongoDB user ID
        session.user.firebaseUid = token.firebaseUid as string; // Firebase UID
        session.user.firstName = token.firstName as string;
        session.user.lastName = token.lastName as string;
        session.user.role = token.role as string;
        session.user.emailVerified = token.emailVerified as boolean;
      }
      return session;
    }
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt', // JWT strategy is recommended for this Firebase + NextAuth approach
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET
};