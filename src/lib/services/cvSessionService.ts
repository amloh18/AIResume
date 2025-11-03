import { CVSession, UnifiedCVDataStructure, CVDesignSettings } from '@/types/cv';

export class CVSessionService {
  private static readonly SESSION_STORAGE_KEY = 'cv_session_';
  private static readonly SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Create a new CV session
   */
  static createSession(
    cvId: string,
    userId: string,
    cvData: UnifiedCVDataStructure,
    template: any,
    designSettings: CVDesignSettings
  ): CVSession {
    const sessionId = `${cvId}_${Date.now()}`;
    
    const session: CVSession = {
      sessionId,
      cvId,
      userId,
      createdAt: new Date(),
      lastModified: new Date(),
      version: 1,
      cvData: cvData as any,
      template: {
        id: template.id,
        name: template.name,
        description: template.description,
        category: template.category,
        globalStyles: template.globalStyles,
        availableSections: template.availableSections || []
      },
      designSettings,
      layout: {
        sectionOrder: ['parse', 'basics', 'work', 'education', 'skills', 'projects', 'certificates', 'languages'],
        activeSection: 'parse',
        panelWidth: 600,
        isCollapsed: false
      },
      status: 'draft',
      isDirty: false,
      autoSaveEnabled: true,
      metadata: {
        title: cvData.basics?.name || 'Untitled CV',
        tags: [],
        editCount: 0
      }
    };

    // Save to localStorage
    this.saveSessionToStorage(session);
    
    return session;
  }

  /**
   * Load existing session for a CV
   */
  static loadSession(cvId: string, userId: string): CVSession | null {
    try {
      const storageKey = this.SESSION_STORAGE_KEY + cvId;
      const sessionData = localStorage.getItem(storageKey);
      
      if (!sessionData) {
        return null;
      }

      const session: CVSession = JSON.parse(sessionData);
      
      // Check if session is expired
      const lastModified = new Date(session.lastModified);
      const now = new Date();
      
      if (now.getTime() - lastModified.getTime() > this.SESSION_TIMEOUT) {
        localStorage.removeItem(storageKey);
        return null;
      }

      // Check if session belongs to current user
      if (session.userId !== userId) {
        localStorage.removeItem(storageKey);
        return null;
      }

      return session;
    } catch (error) {
      console.error('Error loading CV session:', error);
      return null;
    }
  }

  /**
   * Update session with new data
   */
  static updateSession(
    session: CVSession,
    updates: Partial<{
      cvData: UnifiedCVDataStructure;
      designSettings: CVDesignSettings;
      layout: any;
      template: any;
      metadata: any;
    }>
  ): CVSession {
    const updatedSession: CVSession = {
      ...session,
      ...updates,
      cvData: (updates.cvData || session.cvData) as any,
      lastModified: new Date(),
      version: session.version + 1,
      isDirty: true
    };

    this.saveSessionToStorage(updatedSession);
    return updatedSession;
  }

  /**
   * Save session to localStorage
   */
  private static saveSessionToStorage(session: CVSession): void {
    try {
      const storageKey = this.SESSION_STORAGE_KEY + session.cvId;
      localStorage.setItem(storageKey, JSON.stringify(session));
    } catch (error) {
      console.error('Error saving CV session to storage:', error);
    }
  }

  /**
   * Save session to database
   */
  static async saveSessionToDatabase(session: CVSession): Promise<boolean> {
    try {
      const response = await fetch('/api/cv-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(session),
      });

      if (!response.ok) {
        throw new Error('Failed to save session to database');
      }

      // Mark session as not dirty after successful save
      const updatedSession = { ...session, isDirty: false };
      this.saveSessionToStorage(updatedSession);
      
      return true;
    } catch (error) {
      console.error('Error saving session to database:', error);
      return false;
    }
  }

  /**
   * Auto-save session with debouncing
   */
  static debouncedAutoSave = (() => {
    let timeoutId: NodeJS.Timeout | null = null;
    
    return (session: CVSession, delay: number = 1000) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      timeoutId = setTimeout(async () => {
        await this.saveSessionToDatabase(session);
      }, delay);
    };
  })();

  /**
   * Clear session from storage
   */
  static clearSession(cvId: string): void {
    try {
      const storageKey = this.SESSION_STORAGE_KEY + cvId;
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.error('Error clearing CV session:', error);
    }
  }

  /**
   * Get all sessions for a user
   */
  static getUserSessions(userId: string): CVSession[] {
    const sessions: CVSession[] = [];
    
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.SESSION_STORAGE_KEY)) {
          const sessionData = localStorage.getItem(key);
          if (sessionData) {
            const session: CVSession = JSON.parse(sessionData);
            if (session.userId === userId) {
              sessions.push(session);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error getting user sessions:', error);
    }
    
    return sessions.sort((a, b) => 
      new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
    );
  }

  /**
   * Export session as backup
   */
  static exportSession(session: CVSession): string {
    return JSON.stringify(session, null, 2);
  }

  /**
   * Import session from backup
   */
  static importSession(sessionData: string): CVSession | null {
    try {
      const session: CVSession = JSON.parse(sessionData);
      
      // Validate session structure
      if (!session.sessionId || !session.cvId || !session.userId) {
        throw new Error('Invalid session data');
      }
      
      return session;
    } catch (error) {
      console.error('Error importing session:', error);
      return null;
    }
  }

  /**
   * Merge session with current CV data
   */
  static mergeSessionWithCV(session: CVSession, currentCVData: UnifiedCVDataStructure): CVSession {
    return {
      ...session,
      cvData: currentCVData as any,
      lastModified: new Date(),
      version: session.version + 1,
      isDirty: true
    };
  }

  /**
   * Get session statistics
   */
  static getSessionStats(session: CVSession) {
    const editTime = new Date(session.lastModified).getTime() - new Date(session.createdAt).getTime();
    const minutesEdited = Math.floor(editTime / (1000 * 60));
    
    return {
      editDuration: minutesEdited,
      editCount: session.metadata.editCount,
      version: session.version,
      isDirty: session.isDirty,
      lastModified: session.lastModified
    };
  }
}
