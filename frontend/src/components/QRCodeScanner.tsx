import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/library';
import { Box, Typography, Paper, Button, Alert } from '@mui/material';
import { QrCodeScanner, CameraAlt, Stop } from '@mui/icons-material';

interface QRCodeScannerProps {
  onScan: (result: string) => void;
  onError?: (error: string) => void;
  onClose?: () => void;
}

const QRCodeScanner: React.FC<QRCodeScannerProps> = ({ 
  onScan, 
  onError, 
  onClose 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (readerRef.current) {
        readerRef.current.reset();
      }
    };
  }, []);

  const startScanning = async () => {
    try {
      setError(null);
      setIsScanning(true);
      
      readerRef.current = new BrowserMultiFormatReader();
      
      await readerRef.current.decodeFromVideoDevice(
        null,
        videoRef.current!,
        (result, error) => {
          if (result) {
            const scannedText = result.getText();
            console.log('QR Code scanned:', scannedText);
            console.log('Calling onScan with:', scannedText);
            console.log('onScan function type:', typeof onScan);
            console.log('onScan function:', onScan);
            
            // Ensure onScan is called
            try {
              if (typeof onScan === 'function') {
                onScan(scannedText);
                console.log('onScan called successfully');
              } else {
                console.error('onScan is not a function:', onScan);
              }
            } catch (err) {
              console.error('Error calling onScan:', err);
            }
            
            stopScanning();
          }
          if (error && !error.message.includes('No MultiFormat Readers')) {
            console.error('Scan error:', error);
            setError('Fehler beim Scannen. Bitte versuchen Sie es erneut.');
          }
        }
      );
    } catch (err: any) {
      console.error('Scanner error:', err);
      setError('Kamera konnte nicht gestartet werden. Bitte erlauben Sie den Kamera-Zugriff.');
      setIsScanning(false);
      onError?.(err.message);
    }
  };

  const stopScanning = () => {
    if (readerRef.current) {
      readerRef.current.reset();
    }
    setIsScanning(false);
  };

  const handleClose = () => {
    stopScanning();
    onClose?.();
  };

  return (
    <Paper 
      elevation={3} 
      sx={{ 
        p: 3, 
        textAlign: 'center',
        maxWidth: 500,
        mx: 'auto'
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
        <QrCodeScanner color="primary" sx={{ mr: 1 }} />
        <Typography variant="h6" fontWeight="bold">
          QR-Code Scanner
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ mb: 2 }}>
        <video
          ref={videoRef}
          style={{
            width: '100%',
            maxWidth: 400,
            height: 300,
            backgroundColor: '#f5f5f5',
            border: '2px solid #ddd',
            borderRadius: 8
          }}
        />
      </Box>

      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
        {!isScanning ? (
          <Button
            variant="contained"
            startIcon={<CameraAlt />}
            onClick={startScanning}
            size="large"
          >
            Scanner starten
          </Button>
        ) : (
          <Button
            variant="outlined"
            startIcon={<Stop />}
            onClick={stopScanning}
            size="large"
          >
            Scanner stoppen
          </Button>
        )}
        
        {onClose && (
          <Button
            variant="text"
            onClick={handleClose}
            size="large"
          >
            Schließen
          </Button>
        )}
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
        Richten Sie die Kamera auf den QR-Code für den Selbst-Check-in
      </Typography>
    </Paper>
  );
};

export default QRCodeScanner;
