import getConnection from '@/lib/database';
import UserSettings from '@/models/UserSettings';
import Job from '@/models/Job';
import { CalendarService } from './calendarService';

export class AutoSyncService {
  /**
   * Sync job applications to calendar for a specific user
   */
  static async syncUserJobApplications(userId: string): Promise<void> {
    try {
      await getConnection();
      
      // Get user settings
      const userSettings = await UserSettings.findOne({ userId })
        .select('+advanced.integrations.calendar.accessToken +advanced.integrations.calendar.refreshToken');

      if (!userSettings?.advanced?.integrations?.calendar?.connected || 
          !userSettings?.advanced?.integrations?.calendar?.syncEnabled) {
        console.log('Calendar sync not enabled for user:', userId);
        return;
      }

      const calendarSettings = userSettings.advanced.integrations.calendar;
      
      if (!calendarSettings.accessToken) {
        console.log('No calendar access token for user:', userId);
        return;
      }

      // Get job applications (excluding 'created' status)
      const jobs = await Job.find({
        userId,
        status: { $ne: 'created' }
      }).sort({ updatedAt: -1 });

      if (jobs.length === 0) {
        console.log('No job applications to sync for user:', userId);
        return;
      }

      // Convert jobs to calendar events format
      const jobApplications = jobs.map(job => ({
        jobId: job._id.toString(),
        jobTitle: job.jobTitle,
        company: job.company,
        status: job.status,
        applicationDate: job.applicationDate,
        deadline: job.deadline,
        interviews: job.interviews || [],
        followUps: job.followUps || [],
      }));

      // Initialize calendar service
      const calendarService = new CalendarService(
        calendarSettings.accessToken,
        calendarSettings.refreshToken
      );
      
      // Sync to calendar
      await calendarService.syncJobApplicationsToCalendar(jobApplications);

      // Update last sync time
      await UserSettings.findOneAndUpdate(
        { userId },
        { 'advanced.integrations.calendar.lastSync': new Date() }
      );

      console.log(`Successfully synced ${jobApplications.length} job applications to calendar for user:`, userId);
    } catch (error) {
      console.error('Error auto-syncing job applications:', error);
      // Don't throw error to avoid breaking the main application flow
    }
  }

  /**
   * Sync job applications for all users with calendar integration enabled
   */
  static async syncAllUsersJobApplications(): Promise<void> {
    try {
      await getConnection();
      
      // Get all users with calendar sync enabled
      const usersWithCalendarSync = await UserSettings.find({
        'advanced.integrations.calendar.connected': true,
        'advanced.integrations.calendar.syncEnabled': true
      }).select('userId');

      console.log(`Found ${usersWithCalendarSync.length} users with calendar sync enabled`);

      // Sync for each user
      for (const user of usersWithCalendarSync) {
        const userId = user.userId?.toString();
        
        if (userId) {
          await this.syncUserJobApplications(userId);
        }
      }
    } catch (error) {
      console.error('Error syncing all users job applications:', error);
    }
  }

  /**
   * Check if user has calendar sync enabled
   */
  static async isCalendarSyncEnabled(userId: string): Promise<boolean> {
    try {
      await getConnection();
      
      const userSettings = await UserSettings.findOne({ userId });

      return !!(
        userSettings?.advanced?.integrations?.calendar?.connected &&
        userSettings?.advanced?.integrations?.calendar?.syncEnabled
      );
    } catch (error) {
      console.error('Error checking calendar sync status:', error);
      return false;
    }
  }
}
