/**
 * Centralized N8N API Client for Edge Functions
 * Handles URL normalization, credentials, headers, and error standardization
 */

export interface N8NError {
  code: string;
  message: string;
  statusCode?: number;
  details?: any;
  userMessage?: string;
}

export interface N8NClientConfig {
  apiUrl: string;
  apiKey: string;
}

export class N8NAPIClient {
  private config: N8NClientConfig;

  constructor(config: N8NClientConfig) {
    this.config = {
      apiUrl: this.normalizeUrl(config.apiUrl),
      apiKey: config.apiKey
    };
  }

  /**
   * Normalize N8N URL - ensure https:// and no trailing slashes
   */
  private normalizeUrl(url: string): string {
    if (!url) return url;
    url = url.replace(/\/+$/, '');
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return `https://${url}`;
    }
    return url;
  }

  /**
   * Get common headers for N8N API requests
   */
  private getHeaders(additionalHeaders: Record<string, string> = {}): HeadersInit {
    return {
      'X-N8N-API-KEY': this.config.apiKey,
      'Content-Type': 'application/json',
      ...additionalHeaders
    };
  }

  /**
   * Standardize error responses
   */
  private createError(error: any, context: string): N8NError {
    console.error(`N8N API Error (${context}):`, error);

    if (error instanceof Response) {
      return {
        code: 'N8N_API_ERROR',
        message: `N8N API request failed: ${error.statusText}`,
        statusCode: error.status,
        userMessage: 'The workflow service returned an error. Please try again.'
      };
    }

    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return {
        code: 'N8N_CONNECTION_ERROR',
        message: 'Failed to connect to N8N API',
        details: error.message,
        userMessage: 'Unable to connect to the workflow service. Please check your connection.'
      };
    }

    return {
      code: 'N8N_UNKNOWN_ERROR',
      message: error.message || 'Unknown N8N error',
      details: error,
      userMessage: 'An unexpected error occurred with the workflow service.'
    };
  }

  /**
   * Make authenticated request to N8N API
   */
  async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.config.apiUrl}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: this.getHeaders(options.headers as Record<string, string> || {})
      });

      if (!response.ok) {
        throw response;
      }

      // Handle empty responses (e.g., DELETE)
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }

      return {} as T;
    } catch (error) {
      throw this.createError(error, endpoint);
    }
  }

  /**
   * Check N8N health
   */
  async checkHealth(): Promise<{ healthy: boolean; responseTime: number }> {
    const startTime = Date.now();
    
    try {
      // Try to list workflows as a health check
      await this.request('/api/v1/workflows', {
        method: 'GET'
      });
      
      return {
        healthy: true,
        responseTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        healthy: false,
        responseTime: Date.now() - startTime
      };
    }
  }

  /**
   * Validate configuration
   */
  validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.config.apiUrl) {
      errors.push('N8N API URL is not configured');
    }

    if (!this.config.apiKey) {
      errors.push('N8N API Key is not configured');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

/**
 * Create N8N client from environment variables
 */
export function createN8NClient(): N8NAPIClient {
  const apiUrl = Deno.env.get('N8N_API_URL') || '';
  const apiKey = Deno.env.get('N8N_API_KEY') || '';

  return new N8NAPIClient({ apiUrl, apiKey });
}
