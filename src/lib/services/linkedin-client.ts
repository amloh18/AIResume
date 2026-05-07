import { decryptToken } from '@/lib/auth/token-encryption';

/**
 * LinkedIn API Client
 * Handles authenticated requests to LinkedIn API
 */
export class LinkedInClient {
  private accessToken: string;
  private apiVersion: string = '2.0.0';

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  /**
   * Make authenticated request to LinkedIn API
   */
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `https://api.linkedin.com${endpoint}`;
    
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.accessToken}`,
      'X-Restli-Protocol-Version': this.apiVersion,
      'Cache-Control': 'no-cache',
    };

    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `LinkedIn API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  }

  /**
   * Get LinkedIn profile
   */
  async getProfile(fields?: string[]): Promise<any> {
    const defaultFields = [
      'id',
      'firstName',
      'lastName',
      'profilePicture(displayImage~:playableStreams)',
      'headline',
      'summary',
      'vanityName',
      'locationName',
    ];
    
    const projection = fields ? `projection=(${fields.join(',')})` : `projection=(id,firstName,lastName,profilePicture(displayImage~:playableStreams),headline,summary,vanityName,locationName)`;
    
    const data = await this.request<any>(`/v2/me?${projection}`);
    return data;
  }

  /**
   * Get email address
   */
  async getEmailAddress(): Promise<string> {
    const data = await this.request<any>('/v2/emailAddress?q=members&projection=(elements*(handle~))');
    return data.elements?.[0]?.['handle~']?.emailAddress || '';
  }

  async getPositions(): Promise<any[]> {
    const data = await this.request<any>('/v2/positions?q=viewer&start=0&count=100');
    return data.elements || [];
  }

  async getEducations(): Promise<any[]> {
    const data = await this.request<any>('/v2/educations?q=viewer&start=0&count=100');
    return data.elements || [];
  }

  async getSkills(): Promise<any[]> {
    const data = await this.request<any>('/v2/skills?q=viewer&start=0&count=100');
    return data.elements || [];
  }

  async getLanguages(): Promise<any[]> {
    const data = await this.request<any>('/v2/languages?q=viewer&start=0&count=100');
    return data.elements || [];
  }

  async postToFeed(content: string, visibility: 'PUBLIC' | 'CONNECTIONS' = 'PUBLIC'): Promise<any> {
    const payload = {
      author: 'urn:li:person:me',
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text: content,
          },
          shareMediaCategory: 'NONE',
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': visibility,
      },
    };

    const data = await this.request<any>('/v2/ugcPosts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    return data;
  }

  async getProfileStats(): Promise<any> {
    const data = await this.request<any>('/v2/me?projection=(id,firstName,lastName,numConnections)');
    return data;
  }
}

/**
 * Create LinkedIn client from session
 */
export const createLinkedInClientFromSession = (session: any): LinkedInClient | null => {
  const accessToken = session?.user?.linkedInAccessToken;
  
  if (!accessToken) {
    return null;
  }

  try {
    // Token might be encrypted, try to decrypt
    const decryptedToken = decryptToken(accessToken);
    return new LinkedInClient(decryptedToken);
  } catch (error) {
    // If decryption fails, assume token is already plaintext
    return new LinkedInClient(accessToken);
  }
};
