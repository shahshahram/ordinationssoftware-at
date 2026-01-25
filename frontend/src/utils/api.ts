// Dynamische API-URL basierend auf dem aktuellen Hostname
const getApiBaseUrl = () => {
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  // Verwende den aktuellen Hostname statt localhost, damit es auch im Netzwerk funktioniert
  const hostname = window.location.hostname;
  return `http://${hostname}:5001/api`;
};

const API_BASE_URL = getApiBaseUrl();

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
      if (process.env.NODE_ENV === 'development') {
        console.log('API Request with token:', {
          url,
          method,
          hasToken: !!token,
          tokenLength: token.length,
          tokenStart: token.substring(0, 20) + '...',
          headers: defaultHeaders
        });
      }
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.log('API Request without token:', { url, method });
      }
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
      if (process.env.NODE_ENV === 'development') {
        console.log('Sending fetch request to:', url);
        console.log('Request config:', config);
        console.log('Request body:', data ? JSON.stringify(data, null, 2) : 'No body');
      }
      
      // Add timeout (erhöht auf 30 Sekunden für langsamere Verbindungen)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      let response: Response;
      try {
        response = await fetch(url, {
          ...config,
          signal: controller.signal
        });
        clearTimeout(timeoutId);
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        // Wenn der Request abgebrochen wurde (Timeout), werfe einen Netzwerkfehler
        if (fetchError?.name === 'AbortError' || controller.signal.aborted) {
          const networkError = new Error('Netzwerkfehler: Request-Timeout. Bitte versuchen Sie es erneut.');
          (networkError as any).isNetworkError = true;
          (networkError as any).isTimeout = true;
          throw networkError;
        }
        throw fetchError;
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log('Received response:', response.status, response.statusText);
      }
      
      if (!response.ok) {
        // Handle 401 Unauthorized - token might be expired
        if (response.status === 401) {
          if (process.env.NODE_ENV === 'development') {
            console.log('Token expired, attempting to refresh...');
          }
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
                if (process.env.NODE_ENV === 'development') {
                  console.log('Token refresh successful:', refreshData);
                }
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

                if (process.env.NODE_ENV === 'development') {
                  console.log('Retrying original request with new token...');
                }
                const retryResponse = await fetch(url, retryConfig);
                
                if (!retryResponse.ok) {
                  const errorData = await retryResponse.json().catch(() => ({}));
                  if (process.env.NODE_ENV === 'development') {
                    console.error('Retry request failed:', retryResponse.status, errorData);
                  }
                  throw new Error(errorData.message || `HTTP error! status: ${retryResponse.status}`);
                }

                const result = await retryResponse.json();
                if (process.env.NODE_ENV === 'development') {
                  console.log('Retry request successful:', result);
                }
                return result;
              } else {
                // Refresh failed - prüfe ob es ein Netzwerkfehler ist
                const errorData = await refreshResponse.json().catch(() => ({}));
                const isNetworkError = refreshResponse.status === 0;
                
                if (isNetworkError) {
                  console.warn('Token-Refresh fehlgeschlagen wegen Netzwerkfehler - Benutzer wird nicht abgemeldet');
                  throw new Error('Netzwerkfehler: Verbindung zum Server konnte nicht hergestellt werden. Bitte versuchen Sie es erneut.');
                }
                
                // Nur bei echten Auth-Fehlern abmelden
                console.log('Token-Refresh fehlgeschlagen - Benutzer wird abgemeldet');
                localStorage.removeItem('token');
                localStorage.removeItem('refreshToken');
                window.location.href = '/login';
                throw new Error('Session expired. Please login again.');
              }
            } catch (refreshError: any) {
              console.error('Token refresh failed:', refreshError);
              
              // Prüfe ob es ein Netzwerkfehler ist
              const isNetworkError = 
                refreshError?.isNetworkError === true ||
                refreshError?.isTimeout === true ||
                refreshError?.name === 'TypeError' || 
                refreshError?.name === 'AbortError' ||
                (refreshError?.message?.includes('Failed to fetch') || 
                 refreshError?.message?.includes('NetworkError') ||
                 refreshError?.message?.includes('ERR_CONNECTION_RESET') ||
                 refreshError?.message?.includes('Request-Timeout'));
              
              // Bei Netzwerkfehlern: Nicht abmelden, nur Fehler werfen
              if (isNetworkError) {
                if (process.env.NODE_ENV === 'development') {
                  console.warn('Token-Refresh fehlgeschlagen wegen Netzwerkfehler - Benutzer wird nicht abgemeldet');
                }
                throw new Error('Netzwerkfehler: Verbindung zum Server konnte nicht hergestellt werden. Bitte versuchen Sie es erneut.');
              }
              
              // Bei echten Authentifizierungsfehlern: Abmelden
              if (process.env.NODE_ENV === 'development') {
                console.log('Token-Refresh fehlgeschlagen - Authentifizierungsfehler erkannt');
              }
              localStorage.removeItem('token');
              localStorage.removeItem('refreshToken');
              window.location.href = '/login';
              throw new Error('Session expired. Please login again.');
            }
          } else {
            // No refresh token - prüfe ob Token noch gültig ist (könnte Session-Problem sein)
            if (token) {
              try {
                // Versuche Token zu dekodieren (ohne Verifizierung)
                const tokenParts = token.split('.');
                if (tokenParts.length === 3) {
                  const payload = JSON.parse(atob(tokenParts[1]));
                  const exp = payload.exp * 1000; // Convert to milliseconds
                  const now = Date.now();
                  
                  // Wenn Token noch nicht abgelaufen ist, könnte es ein Session-Problem sein
                  if (exp > now) {
                    if (process.env.NODE_ENV === 'development') {
                      console.warn('Token noch gültig, aber kein Refresh-Token vorhanden. Möglicherweise Session-Problem.');
                    }
                    // Versuche Request trotzdem (Session-Validierung ist jetzt optional)
                    throw new Error('Kein Refresh-Token verfügbar. Bitte melden Sie sich erneut an.');
                  }
                }
              } catch (tokenCheckError) {
                // Token ist abgelaufen oder ungültig
              }
            }
            
            // Token abgelaufen und kein Refresh-Token
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
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
      if (process.env.NODE_ENV === 'development') {
        console.log('API response data:', result);
      }
      // Return the data wrapped in ApiResponse structure
      return {
        data: result,
        success: result.success,
        message: result.message
      };
    } catch (error: any) {
      if (process.env.NODE_ENV === 'development') {
        console.error('API request failed:', error);
        console.error('Error details:', {
          name: error?.name || 'Unknown',
          message: error?.message || 'Unknown error',
          stack: error?.stack || 'No stack trace'
        });
      }
      
      // Unterscheide zwischen Netzwerkfehlern und Authentifizierungsfehlern
      const isNetworkError = 
        error?.isNetworkError === true ||
        error?.isTimeout === true ||
        error?.name === 'AbortError' ||
        (error?.name === 'TypeError' && 
         (error?.message?.includes('Failed to fetch') || 
          error?.message?.includes('NetworkError') ||
          error?.message?.includes('ERR_CONNECTION_RESET') ||
          error?.message?.includes('aborted') ||
          error?.message?.includes('Request-Timeout')));
      
      // Bei Netzwerkfehlern: Fehler weiterwerfen, aber NICHT abmelden
      // Nur bei echten Authentifizierungsfehlern (401) wird abgemeldet
      if (isNetworkError) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('Netzwerkfehler erkannt - Benutzer wird nicht abgemeldet:', error.message);
        }
        // Erstelle einen benutzerdefinierten Fehler für Netzwerkfehler
        const networkError = new Error(`Netzwerkfehler: ${error.message}`);
        (networkError as any).isNetworkError = true;
        (networkError as any).originalError = error;
        throw networkError;
      }
      
      // Bei anderen Fehlern: Normal weiterwerfen
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

  async delete<T>(endpoint: string, data?: any, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, 'DELETE', data, headers);
  }
}

const apiClient = new ApiClient(API_BASE_URL);

export const apiRequest = {
  get: <T>(endpoint: string, params?: Record<string, string | string[] | number | boolean>, headers?: Record<string, string>) => apiClient.get<T>(endpoint, params, headers),
  post: <T>(endpoint: string, data?: any, headers?: Record<string, string>) => apiClient.post<T>(endpoint, data, headers),
  put: <T>(endpoint: string, data?: any, headers?: Record<string, string>) => apiClient.put<T>(endpoint, data, headers),
  delete: <T>(endpoint: string, data?: any, headers?: Record<string, string>) => apiClient.delete<T>(endpoint, data, headers),
};

export default apiClient;
