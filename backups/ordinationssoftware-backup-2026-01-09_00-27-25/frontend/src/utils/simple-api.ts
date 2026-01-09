const API_BASE_URL = 'http://localhost:5001/api';

export const simpleApi = {
  async post(endpoint: string, data: any) {
    const url = `${API_BASE_URL}${endpoint}`;
    
    console.log('Simple API Request:', {
      url,
      method: 'POST',
      data,
      timestamp: new Date().toISOString()
    });

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      console.log('Simple API Response:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        timestamp: new Date().toISOString()
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Simple API Error Response:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      console.log('Simple API Success:', result);
      return result;
    } catch (error) {
      console.error('Simple API Catch Error:', error);
      throw error;
    }
  }
};


