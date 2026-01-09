import { useState, useCallback } from 'react';

interface ErrorHandlerOptions {
  showSnackbar?: boolean;
  logError?: boolean;
  fallbackMessage?: string;
}

export const useErrorHandler = (options: ErrorHandlerOptions = {}) => {
  const { showSnackbar = true, logError = true, fallbackMessage = 'Ein Fehler ist aufgetreten' } = options;
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleError = useCallback((error: any, customMessage?: string) => {
    const errorMessage = customMessage || 
      error?.response?.data?.message || 
      error?.message || 
      fallbackMessage;

    if (logError) {
      console.error('Error handled:', error);
    }

    setError(errorMessage);

    if (showSnackbar) {
      // Fallback to console for now - can be replaced with actual snackbar implementation
      console.error('Error:', errorMessage);
    }
  }, [fallbackMessage, logError, showSnackbar]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const executeWithErrorHandling = useCallback(async <T>(
    asyncFunction: () => Promise<T>,
    customErrorMessage?: string
  ): Promise<T | null> => {
    try {
      setIsLoading(true);
      clearError();
      const result = await asyncFunction();
      return result;
    } catch (error) {
      handleError(error, customErrorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [handleError, clearError]);

  return {
    error,
    isLoading,
    handleError,
    clearError,
    executeWithErrorHandling,
  };
};
