import { google } from 'googleapis';

export interface CalendarSyncEvent {
  jobId: string;
  title: string;
  company: string;
  status: string;
  start: Date;
  end: Date;
  description?: string;
  location?: string;
  colorId?: string;
  reminders?: { method: 'email' | 'popup'; minutes: number }[];
}

export interface CalendarSyncResult {
  success: boolean;
  created: number;
  updated: number;
  deleted: number;
  errors: string[];
  provider: 'google' | 'outlook';
}

/**
 * Unified Calendar Sync Service
 * Supports Google Calendar and Outlook Calendar via Microsoft Graph
 */
export class UnifiedCalendarSyncService {
  private accessToken: string;
  private refreshToken?: string;
  private provider: 'google' | 'outlook';
  private expiresAt?: Date;

  constructor(
    accessToken: string,
    refreshToken?: string,
    provider: 'google' | 'outlook' = 'google',
    expiresAt?: Date
  ) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.provider = provider;
    this.expiresAt = expiresAt;
  }

  async syncEvents(events: CalendarSyncEvent[]): Promise<CalendarSyncResult> {
    if (this.provider === 'outlook') {
      return this.syncOutlookEvents(events);
    }
    return this.syncGoogleEvents(events);
  }

  private async syncGoogleEvents(events: CalendarSyncEvent[]): Promise<CalendarSyncResult> {
    const result: CalendarSyncResult = {
      success: true,
      created: 0,
      updated: 0,
      deleted: 0,
      errors: [],
      provider: 'google',
    };

    try {
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );

      oauth2Client.setCredentials({
        access_token: this.accessToken,
        refresh_token: this.refreshToken,
      });

      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

      // Fetch existing events with our marker
      const existingResponse = await calendar.events.list({
        calendarId: 'primary',
        q: 'CVCircle Job Application',
        maxResults: 2500,
        singleEvents: true,
        orderBy: 'startTime',
      });

      const existingEvents = existingResponse.data.items || [];
      const existingMap = new Map(
        existingEvents
          .filter(event => event.extendedProperties?.private?.['cvcircleJobId'])
          .map(event => [event.extendedProperties.private.cvcircleJobId, event])
      );

      const currentJobIds = new Set<string>();

      for (const event of events) {
        currentJobIds.add(event.jobId);
        const existing = existingMap.get(event.jobId);

        const eventBody: any = {
          summary: event.title,
          description: event.description,
          start: {
            dateTime: event.start.toISOString(),
            timeZone: 'UTC',
          },
          end: {
            dateTime: event.end.toISOString(),
            timeZone: 'UTC',
          },
          location: event.location,
          colorId: event.colorId || '1',
          reminders: {
            useDefault: false,
            overrides: event.reminders || [
              { method: 'popup', minutes: 60 },
              { method: 'email', minutes: 1440 },
            ],
          },
          extendedProperties: {
            private: {
              cvcircleJobId: event.jobId,
              cvcircleProvider: 'google',
              cvcircleSyncedAt: new Date().toISOString(),
            },
          },
        };

        try {
          if (existing?.id) {
            await calendar.events.update({
              calendarId: 'primary',
              eventId: existing.id,
              resource: eventBody,
            });
            result.updated++;
          } else {
            await calendar.events.insert({
              calendarId: 'primary',
              resource: eventBody,
            });
            result.created++;
          }
        } catch (err: any) {
          result.errors.push(`Failed to ${existing ? 'update' : 'create'} event for job ${event.jobId}: ${err.message}`);
          result.success = false;
        }
      }

      // Delete events for jobs that no longer exist
      for (const [jobId, event] of Array.from(existingMap.entries())) {
        if (!currentJobIds.has(jobId)) {
          try {
            await calendar.events.delete({
              calendarId: 'primary',
              eventId: event.id!,
            });
            result.deleted++;
          } catch (err: any) {
            result.errors.push(`Failed to delete event ${event.id}: ${err.message}`);
          }
        }
      }
    } catch (err: any) {
      result.success = false;
      result.errors.push(`Google Calendar sync failed: ${err.message}`);
    }

    return result;
  }

  private async syncOutlookEvents(events: CalendarSyncEvent[]): Promise<CalendarSyncResult> {
    const result: CalendarSyncResult = {
      success: true,
      created: 0,
      updated: 0,
      deleted: 0,
      errors: [],
      provider: 'outlook',
    };

    const baseUrl = 'https://graph.microsoft.com/v1.0';
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };

    try {
      // List existing events from CVCircle
      const listResponse = await fetch(
        `${baseUrl}/me/events?$filter=contains(subject,'CVCircle Job Application')&$top=1000&$select=id,subject,start,end`,
        { headers }
      );

      if (!listResponse.ok) {
        throw new Error(`Outlook list events failed: ${listResponse.status} ${listResponse.statusText}`);
      }

      const listData = await listResponse.json();
      const existingEvents = listData.value || [];
      const existingMap = new Map<string, any>();

      for (const event of existingEvents) {
        try {
          const detailResponse = await fetch(`${baseUrl}/me/events/${event.id}?$select=extensions`, { headers });
          if (detailResponse.ok) {
            const detailData = await detailResponse.json();
            const jobId = detailData.extensions?.find((e: any) => e.extensions?.some((ex: any) => ex.id === 'cvcircleJobId'))?.extensions?.find((ex: any) => ex.id === 'cvcircleJobId')?.value;
            if (jobId) existingMap.set(jobId, event);
          }
        } catch {
          // skip events without extensions
        }
      }

      const currentJobIds = new Set<string>();

      for (const event of events) {
        currentJobIds.add(event.jobId);
        const existing = existingMap.get(event.jobId);

        const eventBody: any = {
          subject: event.title,
          body: {
            contentType: 'text',
            content: event.description || '',
          },
          start: {
            dateTime: event.start.toISOString(),
            timeZone: 'UTC',
          },
          end: {
            dateTime: event.end.toISOString(),
            timeZone: 'UTC',
          },
          location: {
            displayName: event.location || event.company,
          },
          reminders: {
            useDefault: false,
            ...(event.reminders?.length ? { alertOverrides: event.reminders.map(r => ({ reminderType: r.method === 'email' ? 'email' : 'alert', minutes: r.minutes })) } : {}),
          },
          categories: event.colorId ? [`CVCircle-${event.colorId}`] : ['CVCircle'],
        };

        try {
          if (existing?.id) {
            await fetch(`${baseUrl}/me/events/${existing.id}`, {
              method: 'PATCH',
              headers,
              body: JSON.stringify(eventBody),
            });
            result.updated++;
          } else {
            const createResponse = await fetch(`${baseUrl}/me/events`, {
              method: 'POST',
              headers,
              body: JSON.stringify(eventBody),
            });
            if (!createResponse.ok) {
              const errText = await createResponse.text();
              throw new Error(`Create failed: ${createResponse.status} ${errText}`);
            }
            result.created++;
          }
        } catch (err: any) {
          result.errors.push(`Failed to ${existing ? 'update' : 'create'} Outlook event for job ${event.jobId}: ${err.message}`);
          result.success = false;
        }
      }

      // Delete removed jobs
      for (const [jobId, event] of Array.from(existingMap.entries())) {
        if (!currentJobIds.has(jobId)) {
          try {
            await fetch(`${baseUrl}/me/events/${event.id}`, { method: 'DELETE', headers });
            result.deleted++;
          } catch (err: any) {
            result.errors.push(`Failed to delete Outlook event ${event.id}: ${err.message}`);
          }
        }
      }
    } catch (err: any) {
      result.success = false;
      result.errors.push(`Outlook Calendar sync failed: ${err.message}`);
    }

    return result;
  }
}
