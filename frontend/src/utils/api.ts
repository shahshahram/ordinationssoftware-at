const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

interface ApiResponse<T = any> {
  data: T;
  message?: string;
  success?: boolean;
  errors?: string[];
  details?: Record<string, any>;
}

// Removed unused ApiError interface

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    data?: any,
    headers: Record<string, string> = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    
    // Get token from localStorage
    const token = localStorage.getItem('token');
    
    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    if (token) {
      defaultHeaders.Authorization = `Bearer ${token}`;
      console.log('API Request with token:', {
        url,
        method,
        hasToken: !!token,
        tokenLength: token.length,
        tokenStart: token.substring(0, 20) + '...',
        headers: defaultHeaders
      });
    } else {
      console.log('API Request without token:', { url, method });
    }

    const config: RequestInit = {
      method,
      headers: defaultHeaders,
    };

    if (data && method !== 'GET') {
      // Wenn data eine FormData-Instanz ist, nicht stringify und Content-Type nicht setzen
      if (data instanceof FormData) {
        config.body = data;
        // Entferne Content-Type Header für FormData, Browser setzt es automatisch mit Boundary
        delete (config.headers as Record<string, string>)['Content-Type'];
      } else {
        config.body = JSON.stringify(data);
      }
    }

    try {
      console.log('Sending fetch request to:', url);
      console.log('Request config:', config);
      console.log('Request body:', data ? JSON.stringify(data, null, 2) : 'No body');
      
      // Add timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(url, {
        ...config,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      console.log('Received response:', response.status, response.statusText);
      
      if (!response.ok) {
        // Handle 401 Unauthorized - token might be expired
        if (response.status === 401) {
          console.log('Token expired, attempting to refresh...');
          const refreshToken = localStorage.getItem('refreshToken');
          
          if (refreshToken) {
            try {
              const refreshResponse = await fetch(`${this.baseURL.replace('/api', '')}/api/auth/refresh`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ refreshToken }),
              });

              if (refreshResponse.ok) {
                const refreshData = await refreshResponse.json();
                console.log('Token refresh successful:', refreshData);
                localStorage.setItem('token', refreshData.token);
                localStorage.setItem('refreshToken', refreshData.refreshToken);
                
                // Retry the original request with new token
                const newHeaders = {
                  ...defaultHeaders,
                  Authorization: `Bearer ${refreshData.token}`,
                };
                
                const retryConfig: RequestInit = {
                  method,
                  headers: newHeaders,
                };

                if (data && method !== 'GET') {
                  retryConfig.body = JSON.stringify(data);
                }

                console.log('Retrying original request with new token...');
                const retryResponse = await fetch(url, retryConfig);
                
                if (!retryResponse.ok) {
                  const errorData = await retryResponse.json().catch(() => ({}));
                  console.error('Retry request failed:', retryResponse.status, errorData);
                  throw new Error(errorData.message || `HTTP error! status: ${retryResponse.status}`);
                }

                const result = await retryResponse.json();
                console.log('Retry request successful:', result);
                return result;
              } else {
                // Refresh failed, redirect to login
                localStorage.removeItem('token');
                localStorage.removeItem('refreshToken');
                window.location.href = '/login';
                throw new Error('Session expired. Please login again.');
              }
            } catch (refreshError) {
              console.error('Token refresh failed:', refreshError);
              localStorage.removeItem('token');
              localStorage.removeItem('refreshToken');
              window.location.href = '/login';
              throw new Error('Session expired. Please login again.');
            }
          } else {
            // No refresh token, redirect to login
            localStorage.removeItem('token');
            window.location.href = '/login';
            throw new Error('Session expired. Please login again.');
          }
        }
        
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(errorData.message || `HTTP error! status: ${response.status}`);
        (error as any).response = { data: errorData, status: response.status };
        throw error;
      }

      const result = await response.json();
      console.log('API response data:', result);
      // Return the data wrapped in ApiResponse structure
      return {
        data: result,
        success: result.success,
        message: result.message
      };
    } catch (error: any) {
      console.error('API request failed:', error);
      console.error('Error details:', {
        name: error?.name || 'Unknown',
        message: error?.message || 'Unknown error',
        stack: error?.stack || 'No stack trace'
      });
      throw error;
    }
  }

  async get<T>(endpoint: string, params?: Record<string, string | string[] | number | boolean>, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    let url = endpoint;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.keys(params).forEach(key => {
        const value = params[key];
        if (Array.isArray(value)) {
          value.forEach(v => searchParams.append(key, String(v)));
        } else if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += (endpoint.includes('?') ? '&' : '?') + queryString;
      }
    }
    return this.request<T>(url, 'GET', undefined, headers);
  }

  async post<T>(endpoint: string, data?: any, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, 'POST', data, headers);
  }

  async put<T>(endpoint: string, data?: any, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, 'PUT', data, headers);
  }

  async delete<T>(endpoint: string, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, 'DELETE', undefined, headers);
  }
}

const apiClient = new ApiClient(API_BASE_URL);

export const apiRequest = {
  get: <T>(endpoint: string, params?: Record<string, string | string[] | number | boolean>, headers?: Record<string, string>) => apiClient.get<T>(endpoint, params, headers),
  post: <T>(endpoint: string, data?: any, headers?: Record<string, string>) => apiClient.post<T>(endpoint, data, headers),
  put: <T>(endpoint: string, data?: any, headers?: Record<string, string>) => apiClient.put<T>(endpoint, data, headers),
  delete: <T>(endpoint: string, headers?: Record<string, string>) => apiClient.delete<T>(endpoint, headers),
};

export default apiClient;
