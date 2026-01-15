import React, { useEffect, useRef } from 'react';
import * as QRCode from 'qrcode';
import { Box, Typography, Paper, Button } from '@mui/material';
import { QrCode, Refresh } from '@mui/icons-material';

interface QRCodeGeneratorProps {
  data: string;
  size?: number;
  onRefresh?: () => void;
  title?: string;
  description?: string;
  showUrl?: boolean;
}

const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({ 
  data, 
  size = 200, 
  onRefresh,
  title = 'Selbst-Check-in Code',
  description = 'Scannen Sie diesen Code mit dem Tablet für den Selbst-Check-in',
  showUrl = true
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current && data) {
      QRCode.toCanvas(canvasRef.current, data, {
        width: size,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      }).catch(console.error);
    }
  }, [data, size]);

  return (
    <Paper 
      elevation={3} 
      sx={{ 
        p: 3, 
        textAlign: 'center',
        maxWidth: 300,
        mx: 'auto'
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
        <QrCode color="primary" sx={{ mr: 1 }} />
        <Typography variant="h6" fontWeight="bold">
          {title}
        </Typography>
      </Box>
      
      <Box sx={{ mb: 2 }}>
        <canvas ref={canvasRef} />
      </Box>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {description}
      </Typography>
      
      {showUrl && (
        <Typography variant="caption" color="text.secondary" sx={{ 
          display: 'block', 
          wordBreak: 'break-all',
          fontSize: '0.7rem',
          mt: 1
        }}>
          URL: {data}
        </Typography>
      )}
      
      {onRefresh && (
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={onRefresh}
          size="small"
        >
          Code erneuern
        </Button>
      )}
    </Paper>
  );
};

export default QRCodeGenerator;
