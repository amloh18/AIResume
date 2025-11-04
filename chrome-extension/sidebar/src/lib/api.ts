interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

class ApiClient {
  private getApiBaseUrl(): string {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      return 'https://www.cvcircle.io'; // Will be updated by background script
    }
    return 'http://localhost:3000';
  }

  private async getAuthToken(): Promise<string | null> {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.get(['authToken'], (result: { authToken?: string }) => {
          resolve(result.authToken || null);
        });
      } else {
        resolve(null);
      }
    });
  }

  private async authenticatedFetch(
    url: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const token = await this.getAuthToken();
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle token expiration
    if (response.status === 401) {
      // Clear invalid token
      if (typeof chrome !== 'undefined' && chrome.storage) {
        await chrome.storage.local.remove(['authToken', 'isAuthenticated', 'userData']);
      }
      
      // Notify about auth error
      throw new Error('AUTH_EXPIRED');
    }

    return response;
  }

  async createJob(jobData: any): Promise<ApiResponse> {
    try {
      const apiUrl = await this.getApiBaseUrl();
      const response = await this.authenticatedFetch(`${apiUrl}/api/jobs`, {
        method: 'POST',
        body: JSON.stringify(jobData),
      });

      const data = await response.json();
      return {
        success: response.ok,
        data: data.data || data,
        error: data.error || (!response.ok ? 'Failed to create job' : undefined),
      };
    } catch (error: any) {
      if (error.message === 'AUTH_EXPIRED') {
        return {
          success: false,
          error: 'AUTH_EXPIRED',
        };
      }
      return {
        success: false,
        error: error.message || 'Network error',
      };
    }
  }

  async updateJob(jobId: string, jobData: any): Promise<ApiResponse> {
    try {
      const apiUrl = await this.getApiBaseUrl();
      const response = await this.authenticatedFetch(`${apiUrl}/api/jobs/${jobId}`, {
        method: 'PUT',
        body: JSON.stringify(jobData),
      });

      const data = await response.json();
      return {
        success: response.ok,
        data: data.data || data,
        error: data.error || (!response.ok ? 'Failed to update job' : undefined),
      };
    } catch (error: any) {
      if (error.message === 'AUTH_EXPIRED') {
        return {
          success: false,
          error: 'AUTH_EXPIRED',
        };
      }
      return {
        success: false,
        error: error.message || 'Network error',
      };
    }
  }

  async getJob(jobId: string): Promise<ApiResponse> {
    try {
      const apiUrl = await this.getApiBaseUrl();
      const response = await this.authenticatedFetch(`${apiUrl}/api/jobs/${jobId}`, {
        method: 'GET',
      });

      const data = await response.json();
      return {
        success: response.ok,
        data: data.data?.job || data.job || data,
        error: data.error || (!response.ok ? 'Failed to fetch job' : undefined),
      };
    } catch (error: any) {
      if (error.message === 'AUTH_EXPIRED') {
        return {
          success: false,
          error: 'AUTH_EXPIRED',
        };
      }
      return {
        success: false,
        error: error.message || 'Network error',
      };
    }
  }

  async getJobs(): Promise<ApiResponse<any[]>> {
    try {
      const apiUrl = await this.getApiBaseUrl();
      const response = await this.authenticatedFetch(`${apiUrl}/api/jobs?limit=50`, {
        method: 'GET',
      });

      const data = await response.json();
      return {
        success: response.ok,
        data: data.data?.jobs || (Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : [])),
        error: data.error || (!response.ok ? 'Failed to fetch jobs' : undefined),
      };
    } catch (error: any) {
      if (error.message === 'AUTH_EXPIRED') {
        return {
          success: false,
          error: 'AUTH_EXPIRED',
          data: [],
        };
      }
      return {
        success: false,
        error: error.message || 'Network error',
        data: [],
      };
    }
  }
}

export const apiClient = new ApiClient();

