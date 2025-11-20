import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  CircularProgress,
  Alert,
  Typography,
  IconButton,
  Toolbar,
  AppBar,
} from '@mui/material';
import {
  Close,
  Download,
  Print,
  Fullscreen,
  FullscreenExit,
} from '@mui/icons-material';
import { apiRequest } from '../utils/api';

interface CDADocumentViewerProps {
  open: boolean;
  onClose: () => void;
  locationId: string;
  documentId: string;
  documentTitle?: string;
}

/**
 * CDA Document Viewer Component
 * Rendert CDA-Dokumente (HL7 CDA Release 2.0) mit dem ELGA Standard-Stylesheet
 */
const CDADocumentViewer: React.FC<CDADocumentViewerProps> = ({
  open,
  onClose,
  locationId,
  documentId,
  documentTitle = 'CDA Dokument',
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [renderedHTML, setRenderedHTML] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (open && locationId && documentId) {
      loadAndRenderCDA();
    } else {
      setRenderedHTML(null);
      setError(null);
      setLoading(true);
    }
  }, [open, locationId, documentId]);

  const loadAndRenderCDA = async () => {
    setLoading(true);
    setError(null);

    try {
      // Lade das Dokument als Text (XML)
      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:5001/api/xds/${locationId}/retrieve/${documentId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/xml, text/xml, */*',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Fehler beim Laden des Dokuments: ${response.statusText}`);
      }

      const xmlText = await response.text();

      // Prüfe ob es ein CDA-Dokument ist
      if (!xmlText.includes('ClinicalDocument') && !xmlText.includes('<?xml')) {
        throw new Error('Kein gültiges CDA/XML-Dokument');
      }

      // Lade ELGA Stylesheet
      const xslResponse = await fetch('/ELGA_Stylesheet_v1.0.xsl');
      if (!xslResponse.ok) {
        throw new Error('ELGA Stylesheet nicht gefunden');
      }
      const xslText = await xslResponse.text();

      // Führe XSLT-Transformation durch
      const transformedHTML = await transformCDAWithELGAStylesheet(xmlText, xslText);
      setRenderedHTML(transformedHTML);
    } catch (err: any) {
      console.error('Fehler beim Rendern des CDA-Dokuments:', err);
      setError(err.message || 'Fehler beim Laden des CDA-Dokuments');
    } finally {
      setLoading(false);
    }
  };

  const transformCDAWithELGAStylesheet = async (
    xmlText: string,
    xslText: string
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      try {
        // Parse XML und XSL
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
        const xslDoc = parser.parseFromString(xslText, 'application/xml');

        // Prüfe auf Parsing-Fehler
        const xmlErrors = xmlDoc.querySelector('parsererror');
        const xslErrors = xslDoc.querySelector('parsererror');

        if (xmlErrors) {
          reject(new Error('XML-Parsing-Fehler: ' + xmlErrors.textContent));
          return;
        }
        if (xslErrors) {
          reject(new Error('XSL-Parsing-Fehler: ' + xslErrors.textContent));
          return;
        }

        // XSLT-Transformation
        if (window.XSLTProcessor) {
          // Moderne Browser: XSLTProcessor
          const processor = new XSLTProcessor();
          processor.importStylesheet(xslDoc);
          const resultDoc = processor.transformToDocument(xmlDoc);

          // Serialisiere zu HTML-String
          const serializer = new XMLSerializer();
          const htmlString = serializer.serializeToString(resultDoc);

          // Extrahiere nur den Body-Inhalt (ohne HTML-Wrapper vom XSLT)
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = htmlString;

          // Das XSLT produziert vollständiges HTML, verwende es direkt
          resolve(htmlString);
        } else {
          reject(new Error('XSLT-Transformation wird von diesem Browser nicht unterstützt'));
        }
      } catch (err: any) {
        reject(err);
      }
    });
  };

  const handleDownload = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:5001/api/xds/${locationId}/retrieve/${documentId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Fehler beim Herunterladen');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${documentTitle || 'document'}.xml`;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setError(err.message || 'Fehler beim Herunterladen');
    }
  };

  const handlePrint = () => {
    if (contentRef.current) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>${documentTitle}</title>
              <style>
                body { margin: 0; padding: 20px; }
                @media print {
                  body { padding: 0; }
                }
              </style>
            </head>
            <body>
              ${contentRef.current.innerHTML}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 250);
      }
    }
  };

  const handleFullscreen = async () => {
    try {
      if (!fullscreen) {
        if (contentRef.current?.requestFullscreen) {
          await contentRef.current.requestFullscreen();
          setFullscreen(true);
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
          setFullscreen(false);
        }
      }
    } catch (err) {
      console.error('Fehler bei Vollbild-Modus:', err);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      fullScreen={fullscreen}
      PaperProps={{
        sx: {
          height: fullscreen ? '100vh' : '90vh',
          maxHeight: fullscreen ? '100vh' : '90vh',
        },
      }}
    >
      <AppBar position="static" color="primary" elevation={1}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {documentTitle}
          </Typography>
          <IconButton
            edge="start"
            color="inherit"
            onClick={handleFullscreen}
            aria-label="Vollbild"
            sx={{ mr: 1 }}
          >
            {fullscreen ? <FullscreenExit /> : <Fullscreen />}
          </IconButton>
          <IconButton
            edge="start"
            color="inherit"
            onClick={handleDownload}
            aria-label="Herunterladen"
            sx={{ mr: 1 }}
          >
            <Download />
          </IconButton>
          <IconButton
            edge="start"
            color="inherit"
            onClick={handlePrint}
            aria-label="Drucken"
            sx={{ mr: 1 }}
          >
            <Print />
          </IconButton>
          <IconButton
            edge="end"
            color="inherit"
            onClick={onClose}
            aria-label="Schließen"
          >
            <Close />
          </IconButton>
        </Toolbar>
      </AppBar>

      <DialogContent
        dividers
        sx={{
          p: 0,
          position: 'relative',
          overflow: 'auto',
          backgroundColor: '#f5f5f5',
        }}
      >
        {loading && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: '400px',
            }}
          >
            <CircularProgress />
            <Typography variant="body2" sx={{ ml: 2 }}>
              Lade CDA-Dokument und wende ELGA Stylesheet an...
            </Typography>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ m: 2 }}>
            {error}
          </Alert>
        )}

        {!loading && !error && renderedHTML && (
          <Box
            ref={contentRef}
            sx={{
              backgroundColor: 'white',
              minHeight: '100%',
              '& *': {
                maxWidth: '100%',
              },
            }}
            dangerouslySetInnerHTML={{ __html: renderedHTML }}
          />
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Schließen</Button>
      </DialogActions>
    </Dialog>
  );
};

export default CDADocumentViewer;

