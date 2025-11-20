import React, { useState } from 'react';
import { Button, Box, Typography, Alert } from '@mui/material';
import { directApi } from '../utils/direct-api';

const LoginTest: React.FC = () => {
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const testLogin = async () => {
    setLoading(true);
    setResult('Testing direct login...');
    
    try {
      console.log('Starting direct login test...');
      const response = await directApi.login('admin@ordinationssoftware.at', 'admin123');
      
      console.log('Direct login response:', response);
      setResult(`Success: ${JSON.stringify(response, null, 2)}`);
    } catch (error: any) {
      console.error('Direct login error:', error);
      setResult(`Error: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Login Test
      </Typography>
      <Button 
        variant="contained" 
        onClick={testLogin} 
        disabled={loading}
        sx={{ mb: 2 }}
      >
        {loading ? 'Testing...' : 'Test Login'}
      </Button>
      
      {result && (
        <Alert severity={result.includes('Error') ? 'error' : 'success'}>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px' }}>
            {result}
          </pre>
        </Alert>
      )}
    </Box>
  );
};

export default LoginTest;
