// Direct API implementation without complex error handling
export const directApi = {
  async login(email: string, password: string) {
    const url = 'http://localhost:5001/api/auth/login';
    
    console.log('Direct API: Starting login request');
    console.log('Direct API: URL:', url);
    console.log('Direct API: Data:', { email, password: '***' });
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      
      console.log('Direct API: Response status:', response.status);
      console.log('Direct API: Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Direct API: Error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      console.log('Direct API: Success data:', data);
      
      return data;
    } catch (error) {
      console.error('Direct API: Catch error:', error);
      throw error;
    }
  }
};


