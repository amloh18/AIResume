import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

export interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
  }>;
  location?: string;
  colorId?: string;
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{
      method: 'email' | 'popup';
      minutes: number;
    }>;
  };
}

export interface JobApplicationEvent {
  jobId: string;
  jobTitle: string;
  company: string;
  status: string;
  applicationDate?: Date;
  deadline?: Date;
  interviews?: Array<{
    type: string;
    date: Date;
    duration?: number;
    interviewer?: string;
    notes?: string;
  }>;
  followUps?: Array<{
    date: Date;
    type: string;
    description: string;
  }>;
}

export class CalendarService {
  private oauth2Client: OAuth2Client;
  private calendar: any;

  constructor(accessToken: string, refreshToken?: string) {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    this.oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
  }

  /**
   * Create a calendar event for a job application
   */
  async createJobApplicationEvent(jobApp: JobApplicationEvent): Promise<CalendarEvent> {
    const eventTitle = this.getEventTitle(jobApp);
    const eventDescription = this.getEventDescription(jobApp);
    const eventTime = this.getEventTime(jobApp);

    const event: CalendarEvent = {
      summary: eventTitle,
      description: eventDescription,
      start: eventTime.start,
      end: eventTime.end,
      location: jobApp.company,
      colorId: this.getColorIdForStatus(jobApp.status),
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 60 },
          { method: 'email', minutes: 1440 }, // 24 hours
        ],
      },
    };

    try {
      const response = await this.calendar.events.insert({
        calendarId: 'primary',
        resource: event,
      });

      return response.data;
    } catch (error) {
      console.error('Error creating calendar event:', error);
      throw new Error('Failed to create calendar event');
    }
  }

  /**
   * Update an existing calendar event
   */
  async updateJobApplicationEvent(eventId: string, jobApp: JobApplicationEvent): Promise<CalendarEvent> {
    const eventTitle = this.getEventTitle(jobApp);
    const eventDescription = this.getEventDescription(jobApp);
    const eventTime = this.getEventTime(jobApp);

    const event: CalendarEvent = {
      summary: eventTitle,
      description: eventDescription,
      start: eventTime.start,
      end: eventTime.end,
      location: jobApp.company,
      colorId: this.getColorIdForStatus(jobApp.status),
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 60 },
          { method: 'email', minutes: 1440 },
        ],
      },
    };

    try {
      const response = await this.calendar.events.update({
        calendarId: 'primary',
        eventId: eventId,
        resource: event,
      });

      return response.data;
    } catch (error) {
      console.error('Error updating calendar event:', error);
      throw new Error('Failed to update calendar event');
    }
  }

  /**
   * Delete a calendar event
   */
  async deleteJobApplicationEvent(eventId: string): Promise<void> {
    try {
      await this.calendar.events.delete({
        calendarId: 'primary',
        eventId: eventId,
      });
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      throw new Error('Failed to delete calendar event');
    }
  }

  /**
   * Get all calendar events for job applications
   */
  async getJobApplicationEvents(): Promise<CalendarEvent[]> {
    try {
      const response = await this.calendar.events.list({
        calendarId: 'primary',
        q: 'Job Application:', // Search for events with this prefix
        maxResults: 100,
        singleEvents: true,
        orderBy: 'startTime',
      });

      return response.data.items || [];
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      throw new Error('Failed to fetch calendar events');
    }
  }

  /**
   * Sync all job applications to calendar
   */
  async syncJobApplicationsToCalendar(jobApplications: JobApplicationEvent[]): Promise<void> {
    try {
      // Get existing job application events
      const existingEvents = await this.getJobApplicationEvents();
      const existingEventMap = new Map(
        existingEvents.map(event => [this.extractJobIdFromEvent(event), event])
      );

      // Process each job application
      for (const jobApp of jobApplications) {
        const existingEvent = existingEventMap.get(jobApp.jobId);
        
        if (existingEvent) {
          // Update existing event
          await this.updateJobApplicationEvent(existingEvent.id!, jobApp);
        } else {
          // Create new event
          await this.createJobApplicationEvent(jobApp);
        }
      }

      // Remove events for jobs that no longer exist
      const currentJobIds = new Set(jobApplications.map(job => job.jobId));
      for (const [jobId, event] of existingEventMap) {
        if (!currentJobIds.has(jobId)) {
          await this.deleteJobApplicationEvent(event.id!);
        }
      }
    } catch (error) {
      console.error('Error syncing job applications to calendar:', error);
      throw new Error('Failed to sync job applications to calendar');
    }
  }

  /**
   * Get OAuth2 authorization URL
   */
  static getAuthUrl(): string {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
    ];

    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  static async getTokensFromCode(code: string): Promise<{ accessToken: string; refreshToken: string }> {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    const { tokens } = await oauth2Client.getToken(code);
    
    return {
      accessToken: tokens.access_token!,
      refreshToken: tokens.refresh_token!,
    };
  }

  // Helper methods
  private getEventTitle(jobApp: JobApplicationEvent): string {
    const statusEmoji = this.getStatusEmoji(jobApp.status);
    return `${statusEmoji} Job Application: ${jobApp.jobTitle} at ${jobApp.company}`;
  }

  private getEventDescription(jobApp: JobApplicationEvent): string {
    let description = `Job Application Status: ${jobApp.status}\n\n`;
    
    if (jobApp.applicationDate) {
      description += `Application Date: ${jobApp.applicationDate.toLocaleDateString()}\n`;
    }
    
    if (jobApp.deadline) {
      description += `Deadline: ${jobApp.deadline.toLocaleDateString()}\n`;
    }

    if (jobApp.interviews && jobApp.interviews.length > 0) {
      description += `\nInterviews:\n`;
      jobApp.interviews.forEach((interview, index) => {
        description += `${index + 1}. ${interview.type} - ${interview.date.toLocaleDateString()}`;
        if (interview.interviewer) {
          description += ` (${interview.interviewer})`;
        }
        description += `\n`;
      });
    }

    if (jobApp.followUps && jobApp.followUps.length > 0) {
      description += `\nFollow-ups:\n`;
      jobApp.followUps.forEach((followUp, index) => {
        description += `${index + 1}. ${followUp.type} - ${followUp.date.toLocaleDateString()}: ${followUp.description}\n`;
      });
    }

    return description;
  }

  private getEventTime(jobApp: JobApplicationEvent): { start: any; end: any } {
    // Use application date or deadline, or current date as fallback
    const eventDate = jobApp.applicationDate || jobApp.deadline || new Date();
    
    return {
      start: {
        dateTime: eventDate.toISOString(),
        timeZone: 'UTC',
      },
      end: {
        dateTime: new Date(eventDate.getTime() + 60 * 60 * 1000).toISOString(), // 1 hour duration
        timeZone: 'UTC',
      },
    };
  }

  private getColorIdForStatus(status: string): string {
    const colorMap: Record<string, string> = {
      'created': '1', // Blue
      'applied': '2', // Green
      'screening': '3', // Purple
      'interview': '4', // Orange
      'offer': '5', // Red
      'rejected': '6', // Yellow
      'accepted': '7', // Turquoise
      'withdrawn': '8', // Gray
    };
    
    return colorMap[status] || '1';
  }

  private getStatusEmoji(status: string): string {
    const emojiMap: Record<string, string> = {
      'created': '📝',
      'applied': '📤',
      'screening': '🔍',
      'interview': '💼',
      'offer': '🎉',
      'rejected': '❌',
      'accepted': '✅',
      'withdrawn': '↩️',
    };
    
    return emojiMap[status] || '📝';
  }

  private extractJobIdFromEvent(event: CalendarEvent): string {
    // Extract job ID from event description or summary
    // This is a simple implementation - you might want to store job ID in event extended properties
    const match = event.description?.match(/Job ID: (\w+)/);
    return match ? match[1] : '';
  }
}
