import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Typography,
  CircularProgress,
  Alert
} from '@mui/material';
import { Close, ZoomIn, ZoomOut, RotateLeft, RotateRight, Refresh, NavigateBefore, NavigateNext } from '@mui/icons-material';
import * as dicomParser from 'dicom-parser';

const API_BASE_URL = (process.env.REACT_APP_API_URL || 'http://localhost:5001/api').replace(/\/api$/, '') || 'http://localhost:5001';

interface DicomViewerProps {
  open: boolean;
  onClose: () => void;
  studyId: string;
  studyInstanceUID?: string;
  seriesInstanceUID?: string;
  sopInstanceUID?: string;
  seriesImages?: Array<{
    _id: string;
    studyInstanceUID: string;
    seriesInstanceUID?: string;
    sopInstanceUID?: string;
    instanceNumber?: number;
  }>;
}

const DicomViewer: React.FC<DicomViewerProps> = ({
  open,
  onClose,
  studyId,
  studyInstanceUID,
  seriesInstanceUID,
  sopInstanceUID,
  seriesImages
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  const imageDataRef = useRef<ImageData | null>(null);
  const imageWidthRef = useRef<number>(0);
  const imageHeightRef = useRef<number>(0);

  const renderImage = () => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !imageDataRef.current) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    if (containerWidth === 0 || containerHeight === 0) {
      requestAnimationFrame(renderImage);
      return;
    }

    const dpr = window.devicePixelRatio || 1;
    canvas.width = containerWidth * dpr;
    canvas.height = containerHeight * dpr;
    canvas.style.width = `${containerWidth}px`;
    canvas.style.height = `${containerHeight}px`;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    
    // Schwarzer Hintergrund
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, containerWidth, containerHeight);

    const imgWidth = imageWidthRef.current;
    const imgHeight = imageHeightRef.current;
    
    if (imgWidth === 0 || imgHeight === 0) return;

    // Berechne Skalierung
    const scaleX = containerWidth / imgWidth;
    const scaleY = containerHeight / imgHeight;
    const fitScale = Math.min(scaleX, scaleY);
    const finalScale = fitScale * scale;
    
    // Berechne skalierte Dimensionen
    const scaledWidth = imgWidth * finalScale;
    const scaledHeight = imgHeight * finalScale;
    
    // Zentrum des Containers
    const centerX = containerWidth / 2;
    const centerY = containerHeight / 2;
    
    // Erstelle temporäres Canvas mit dem ImageData
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = imgWidth;
    tempCanvas.height = imgHeight;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;
    tempCtx.putImageData(imageDataRef.current, 0, 0);
    
    ctx.save();
    
    // Transformationen: Rotiere um das Zentrum
    ctx.translate(centerX + panX, centerY + panY);
    ctx.rotate((rotation * Math.PI) / 180);
    
    // Zeichne das Bild skaliert und zentriert
    ctx.drawImage(
      tempCanvas,
      -scaledWidth / 2,
      -scaledHeight / 2,
      scaledWidth,
      scaledHeight
    );
    
    ctx.restore();
  };

  useEffect(() => {
    if (open && studyId) {
      // Finde den Index des aktuellen Bildes in der Serie
      if (seriesImages && sopInstanceUID) {
        const index = seriesImages.findIndex(img => img.sopInstanceUID === sopInstanceUID);
        if (index >= 0) {
          setCurrentImageIndex(index);
        }
      } else {
        setCurrentImageIndex(0);
      }
      loadDicomImage();
    }
  }, [open, studyId, studyInstanceUID, seriesInstanceUID, sopInstanceUID]);

  useEffect(() => {
    if (open && seriesImages && seriesImages.length > 0 && currentImageIndex >= 0 && currentImageIndex < seriesImages.length) {
      loadDicomImage();
    }
  }, [currentImageIndex]);

  useEffect(() => {
    if (imageDataRef.current) {
      renderImage();
    }
  }, [scale, rotation, panX, panY]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const resizeObserver = new ResizeObserver(() => {
      if (imageDataRef.current) {
        renderImage();
      }
    });
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  // Stelle sicher, dass renderImage aufgerufen wird, wenn der Dialog geöffnet wird
  useEffect(() => {
    if (open && imageDataRef.current) {
      const checkAndRender = () => {
        const container = containerRef.current;
        if (container && container.clientWidth > 0 && container.clientHeight > 0) {
          renderImage();
        } else {
          requestAnimationFrame(checkAndRender);
        }
      };
      requestAnimationFrame(checkAndRender);
    }
  }, [open]);

  const loadDicomImage = async () => {
    try {
      setLoading(true);
      setError(null);

      const backendUrl = API_BASE_URL;
      let wadoUrl: string;
      
      // Wenn seriesImages vorhanden ist, verwende das aktuelle Bild
      if (seriesImages && seriesImages.length > 0 && currentImageIndex >= 0 && currentImageIndex < seriesImages.length) {
        const currentImage = seriesImages[currentImageIndex];
        if (currentImage.studyInstanceUID && currentImage.sopInstanceUID) {
          wadoUrl = `${backendUrl}/api/dicom/wado?studyInstanceUID=${currentImage.studyInstanceUID}&seriesInstanceUID=${currentImage.seriesInstanceUID || ''}&objectUID=${currentImage.sopInstanceUID}`;
        } else {
          wadoUrl = `${backendUrl}/api/dicom/studies/${currentImage._id}/file`;
        }
      } else if (studyInstanceUID && sopInstanceUID) {
        wadoUrl = `${backendUrl}/api/dicom/wado?studyInstanceUID=${studyInstanceUID}&seriesInstanceUID=${seriesInstanceUID || ''}&objectUID=${sopInstanceUID}`;
      } else {
        wadoUrl = `${backendUrl}/api/dicom/studies/${studyId}/file`;
      }

      const token = localStorage.getItem('token');
      const response = await fetch(wadoUrl, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const dicomData = new Uint8Array(arrayBuffer);
      const dataSet = dicomParser.parseDicom(dicomData);
      
      const width = dataSet.uint16('x00280011') || 256;
      const height = dataSet.uint16('x00280010') || 256;
      const bitsAllocated = dataSet.uint16('x00280100') || 16;
      
      const pixelDataElement = dataSet.elements['x7fe00010'];
      if (!pixelDataElement) {
        throw new Error('Keine Pixel-Daten gefunden');
      }

      const pixelDataOffset = pixelDataElement.dataOffset;
      const pixelDataBytes = dicomData.slice(pixelDataOffset, pixelDataOffset + pixelDataElement.length);
      
      let pixelData: Uint16Array;
      if (bitsAllocated === 16) {
        const numPixels = Math.floor(pixelDataBytes.length / 2);
        pixelData = new Uint16Array(numPixels);
        const view = new DataView(pixelDataBytes.buffer, pixelDataBytes.byteOffset, pixelDataBytes.byteLength);
        for (let i = 0; i < numPixels; i++) {
          pixelData[i] = view.getUint16(i * 2, true);
        }
      } else {
        pixelData = new Uint16Array(pixelDataBytes.length);
        for (let i = 0; i < pixelDataBytes.length; i++) {
          pixelData[i] = pixelDataBytes[i];
        }
      }

      // Finde min/max
      let min = pixelData[0];
      let max = pixelData[0];
      for (let i = 1; i < pixelData.length; i++) {
        if (pixelData[i] < min) min = pixelData[i];
        if (pixelData[i] > max) max = pixelData[i];
      }

      // Normalisiere
      const range = max - min || 1;
      const expectedPixels = width * height;
      const normalized = new Uint8Array(expectedPixels);
      
      // Stelle sicher, dass wir die richtige Anzahl von Pixeln haben
      const numPixels = Math.min(pixelData.length, expectedPixels);
      
      for (let i = 0; i < numPixels; i++) {
        const normalizedValue = Math.round(((pixelData[i] - min) / range) * 255);
        normalized[i] = Math.max(0, Math.min(255, normalizedValue));
      }
      
      // Fülle restliche Pixel mit 0, falls pixelData kürzer ist
      for (let i = numPixels; i < expectedPixels; i++) {
        normalized[i] = 0;
      }

      // Erstelle ImageData
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = width;
      tempCanvas.height = height;
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) throw new Error('Konnte Canvas-Kontext nicht erstellen');

      const imageData = tempCtx.createImageData(width, height);
      
      // Kopiere normalisierte Werte in ImageData
      for (let i = 0; i < normalized.length; i++) {
        const val = normalized[i];
        const idx = i * 4;
        imageData.data[idx] = val;
        imageData.data[idx + 1] = val;
        imageData.data[idx + 2] = val;
        imageData.data[idx + 3] = 255;
      }

      imageDataRef.current = imageData;
      imageWidthRef.current = width;
      imageHeightRef.current = height;

      setLoading(false);
      
      // Warte, bis der Container eine Größe hat, dann rendere
      const tryRender = () => {
        const container = containerRef.current;
        if (container && container.clientWidth > 0 && container.clientHeight > 0) {
          renderImage();
        } else {
          requestAnimationFrame(tryRender);
        }
      };
      
      requestAnimationFrame(tryRender);
    } catch (err: any) {
      console.error('Fehler beim Laden:', err);
      setError(err.message || 'Fehler beim Laden des DICOM-Bildes');
      setLoading(false);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale(prev => Math.max(0.1, Math.min(10, prev * delta)));
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 0) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - panX, y: e.clientY - panY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning) {
      setPanX(e.clientX - panStart.x);
      setPanY(e.clientY - panStart.y);
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleZoomIn = () => {
    setScale(prev => Math.min(10, prev * 1.2));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(0.1, prev / 1.2));
  };

  const handleRotateLeft = () => {
    setRotation(prev => prev - 90);
  };

  const handleRotateRight = () => {
    setRotation(prev => prev + 90);
  };

  const handleReset = () => {
    setScale(1);
    setRotation(0);
    setPanX(0);
    setPanY(0);
  };

  const handlePreviousImage = () => {
    if (seriesImages && currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1);
      setScale(1);
      setRotation(0);
      setPanX(0);
      setPanY(0);
    }
  };

  const handleNextImage = () => {
    if (seriesImages && currentImageIndex < seriesImages.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1);
      setScale(1);
      setRotation(0);
      setPanX(0);
      setPanY(0);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xl"
      fullWidth
      PaperProps={{
        style: {
          height: '90vh',
          maxHeight: '90vh'
        }
      }}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center" gap={2}>
            <Typography variant="h6">DICOM Viewer</Typography>
            {seriesImages && seriesImages.length > 1 && (
              <Typography variant="body2" color="text.secondary">
                Bild {currentImageIndex + 1} von {seriesImages.length}
              </Typography>
            )}
          </Box>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent style={{ padding: 0, position: 'relative', height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {loading && (
          <Box display="flex" justifyContent="center" alignItems="center" style={{ height: '100%' }}>
            <CircularProgress />
          </Box>
        )}
        {error && (
          <Alert severity="error" style={{ margin: '16px' }}>
            {error}
          </Alert>
        )}
        <Box
          ref={containerRef}
          sx={{
            width: '100%',
            height: '100%',
            flex: 1,
            position: 'relative',
            minHeight: '600px',
            backgroundColor: '#000',
            overflow: 'hidden',
            touchAction: 'none',
            userSelect: 'none'
          }}
        >
          <canvas
            ref={canvasRef}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{
              display: 'block',
              width: '100%',
              height: '100%',
              cursor: isPanning ? 'grabbing' : 'grab'
            }}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Box display="flex" gap={1} alignItems="center" flex={1} flexWrap="wrap">
          {seriesImages && seriesImages.length > 1 && (
            <>
              <Button 
                variant="outlined" 
                size="small" 
                startIcon={<NavigateBefore />} 
                onClick={handlePreviousImage} 
                disabled={loading || currentImageIndex === 0}
              >
                Vorheriges
              </Button>
              <Button 
                variant="outlined" 
                size="small" 
                endIcon={<NavigateNext />} 
                onClick={handleNextImage} 
                disabled={loading || currentImageIndex === seriesImages.length - 1}
              >
                Nächstes
              </Button>
              <Box sx={{ width: '1px', height: '24px', bgcolor: 'divider', mx: 1 }} />
            </>
          )}
          <Button variant="outlined" size="small" startIcon={<ZoomIn />} onClick={handleZoomIn} disabled={loading}>
            Vergrößern
          </Button>
          <Button variant="outlined" size="small" startIcon={<ZoomOut />} onClick={handleZoomOut} disabled={loading}>
            Verkleinern
          </Button>
          <Button variant="outlined" size="small" startIcon={<RotateLeft />} onClick={handleRotateLeft} disabled={loading}>
            Links drehen
          </Button>
          <Button variant="outlined" size="small" startIcon={<RotateRight />} onClick={handleRotateRight} disabled={loading}>
            Rechts drehen
          </Button>
          <Button variant="outlined" size="small" startIcon={<Refresh />} onClick={handleReset} disabled={loading}>
            Zurücksetzen
          </Button>
        </Box>
        <Button onClick={onClose}>Schließen</Button>
      </DialogActions>
    </Dialog>
  );
};

export default DicomViewer;
