import { currentUser } from '@clerk/nextjs'
import connectDB from './database'
import { User } from '@/models'

/**
 * Get or create user in MongoDB based on Clerk user data
 */
export async function getOrCreateClerkUser() {
  try {
    const clerkUser = await currentUser()
    
    if (!clerkUser) {
      return null
    }

    await connectDB()

    // Check if user exists in MongoDB
    let user = await User.findOne({ clerkId: clerkUser.id })
    
    if (!user) {
      // Create new user in MongoDB
      user = new User({
        clerkId: clerkUser.id,
        email: clerkUser.emailAddresses[0]?.emailAddress,
        firstName: clerkUser.firstName || 'User',
        lastName: clerkUser.lastName || '',
        avatar: clerkUser.imageUrl,
        isEmailVerified: clerkUser.emailAddresses[0]?.verification?.status === 'verified',
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
      })

      await user.save()
      console.log('✅ New Clerk user created in MongoDB:', user._id)
    } else {
      // Update existing user data
      user.email = clerkUser.emailAddresses[0]?.emailAddress || user.email
      user.firstName = clerkUser.firstName || user.firstName
      user.lastName = clerkUser.lastName || user.lastName
      user.avatar = clerkUser.imageUrl || user.avatar
      user.isEmailVerified = clerkUser.emailAddresses[0]?.verification?.status === 'verified'
      user.lastLogin = new Date()
      
      await user.save()
      console.log('✅ Clerk user updated in MongoDB:', user._id)
    }

    return user
  } catch (error) {
    console.error('❌ Error syncing Clerk user with MongoDB:', error)
    return null
  }
}

/**
 * Get user by Clerk ID
 */
export async function getUserByClerkId(clerkId: string) {
  try {
    await connectDB()
    return await User.findOne({ clerkId })
  } catch (error) {
    console.error('❌ Error getting user by Clerk ID:', error)
    return null
  }
}

/**
 * Delete user from MongoDB when deleted from Clerk
 */
export async function deleteClerkUser(clerkId: string) {
  try {
    await connectDB()
    const result = await User.deleteOne({ clerkId })
    console.log('✅ Clerk user deleted from MongoDB:', result.deletedCount)
    return result.deletedCount > 0
  } catch (error) {
    console.error('❌ Error deleting Clerk user from MongoDB:', error)
    return false
  }
}
