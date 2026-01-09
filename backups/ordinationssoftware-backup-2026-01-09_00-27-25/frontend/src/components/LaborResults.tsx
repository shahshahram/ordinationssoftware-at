import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Card,
  CardContent,
  Button,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormControl,
  FormLabel,
  List,
  ListItem,
  ListItemText,
  Divider,
  Chip as MuiChip
} from '@mui/material';
import {
  ExpandMore,
  Warning,
  TrendingUp,
  TrendingDown,
  Remove,
  CalendarToday,
  LocalHospital,
  AccessTime,
  PictureAsPdf,
  Print,
  Add,
  Edit,
  Scanner,
  Keyboard,
  UnfoldMore,
  UnfoldLess,
  History
} from '@mui/icons-material';
import api from '../utils/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ManualLaborEntry from './ManualLaborEntry';

interface LaborResult {
  _id: string;
  resultDate: string;
  collectionDate: string;
  status: string;
  providerId: {
    name: string;
    code: string;
  };
  results: Array<{
    loincCode: string;
    testName: string;
    value: number | string;
    unit: string;
    referenceRange: {
      low?: number;
      high?: number;
      text?: string;
    };
    interpretation: 'normal' | 'low' | 'high' | 'critical' | 'abnormal';
    isCritical: boolean;
    comment?: string;
  }>;
  interpretation?: string;
  laboratoryComment?: string;
  hasCriticalValues?: boolean;
  metadata?: {
    sourceFormat?: 'fhir' | 'hl7v2' | 'hl7v3' | 'rest' | 'csv' | 'xml' | 'json' | 'manual' | 'scan';
    isScanned?: boolean;
    editHistory?: Array<{
      editedAt: string;
      editedBy?: {
        firstName?: string;
        lastName?: string;
      };
      oldValues?: any;
      newValues?: any;
      changes?: any;
    }>;
  };
}

interface LaborResultsProps {
  patientId?: string; // Optional: Wenn nicht vorhanden, kann Patient im Dialog ausgewählt werden
  patientData?: {
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
    gender?: string;
    svNumber?: string;
  };
}

const LaborResults: React.FC<LaborResultsProps> = ({ patientId, patientData }) => {
  const [results, setResults] = useState<LaborResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedTest, setSelectedTest] = useState<string | null>(null);
  const [patientInfo, setPatientInfo] = useState<any>(null);
  const [manualEntryOpen, setManualEntryOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportType, setExportType] = useState<'pdf' | 'print'>('pdf');
  const [dateRange, setDateRange] = useState<string>('latest');
  const [editingResult, setEditingResult] = useState<LaborResult | null>(null);
  const [expandedResults, setExpandedResults] = useState<Record<string, boolean>>({});
  const [hasUserInteracted, setHasUserInteracted] = useState(false);

  useEffect(() => {
    if (patientId) {
      fetchLaborResults();
      if (!patientData) {
        fetchPatientInfo();
      } else {
        setPatientInfo(patientData);
      }
    } else {
      // Wenn kein patientId vorhanden ist, setze results auf leeres Array
      setResults([]);
      setLoading(false);
    }
  }, [patientId, patientData]);

  const fetchPatientInfo = async () => {
    try {
      const response = await api.get<any>(`/patients-extended/${patientId}`);
      if (response.success && response.data) {
        setPatientInfo(response.data);
      }
    } catch (err) {
      console.error('Error fetching patient info:', err);
    }
  };

  const fetchLaborResults = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching labor results for patient:', patientId);
      const response = await api.get<any>(`/labor/patient/${patientId}`);
      console.log('Labor results response:', response);
      if (response.success) {
        // Die API gibt { success: true, data: [...], count: ... } zurück
        const data = response.data;
        const count = (response as any).count;
        console.log('Labor results data:', data, 'Type:', Array.isArray(data), 'Count:', count);
        // Sicherstellen, dass data ein Array ist
        if (Array.isArray(data)) {
          setResults(data);
        } else if (data && Array.isArray(data.data)) {
          // Fallback: falls die Struktur anders ist
          setResults(data.data);
        } else {
          console.warn('Unexpected data structure:', data);
          setResults([]);
        }
      } else {
        console.warn('Labor results response not successful:', response);
        setResults([]);
      }
    } catch (err: any) {
      console.error('Error fetching labor results:', err);
      console.error('Error details:', err.response?.data);
      setError(err.response?.data?.message || 'Fehler beim Laden der Laborwerte');
      setResults([]); // Sicherstellen, dass results ein Array bleibt
    } finally {
      setLoading(false);
    }
  };

  const getInterpretationColor = (interpretation: string) => {
    switch (interpretation) {
      case 'critical':
        return 'error';
      case 'high':
      case 'low':
        return 'warning'; // Dezenter als 'error'
      case 'normal':
        return 'success';
      default:
        return 'default';
    }
  };

  const getInterpretationIcon = (interpretation: string) => {
    switch (interpretation) {
      case 'high':
        return <TrendingUp fontSize="small" />;
      case 'low':
        return <TrendingDown fontSize="small" />;
      case 'critical':
        return <Warning fontSize="small" />;
      default:
        return <Remove fontSize="small" />;
    }
  };

  // Bestimme die Quelle eines Laborergebnisses
  const getSourceLabel = (result: LaborResult): { label: string; color: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' } => {
    const sourceFormat = result.metadata?.sourceFormat;
    const isScanned = result.metadata?.isScanned;
    
    if (sourceFormat === 'scan' || isScanned === true) {
      return { label: 'Per Scan', color: 'info' };
    } else if (sourceFormat === 'manual') {
      return { label: 'Manuell', color: 'primary' };
    } else {
      return { label: 'Importiert', color: 'default' };
    }
  };

  // Prüfe ob ein Laborergebnis bearbeitbar ist
  const isEditable = (result: LaborResult): boolean => {
    const sourceFormat = result.metadata?.sourceFormat;
    const isScanned = result.metadata?.isScanned;
    return sourceFormat === 'manual' || sourceFormat === 'scan' || isScanned === true;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatReferenceRange = (range: { low?: number; high?: number; text?: string }) => {
    if (range.text) {
      return range.text;
    }
    if (range.low !== undefined && range.high !== undefined) {
      return `${range.low} - ${range.high}`;
    }
    if (range.low !== undefined) {
      return `> ${range.low}`;
    }
    if (range.high !== undefined) {
      return `< ${range.high}`;
    }
    return '-';
  };

  const getFilteredResults = (range: string) => {
    if (range === 'all') {
      return results;
    }

    if (range === 'latest') {
      // Sortiere nach Datum (neueste zuerst) und nimm nur den ersten
      const sorted = [...results].sort((a, b) => {
        return new Date(b.resultDate).getTime() - new Date(a.resultDate).getTime();
      });
      return sorted.length > 0 ? [sorted[0]] : [];
    }

    const now = new Date();
    const cutoffDate = new Date();

    switch (range) {
      case '3months':
        cutoffDate.setMonth(now.getMonth() - 3);
        break;
      case '6months':
        cutoffDate.setMonth(now.getMonth() - 6);
        break;
      case '12months':
        cutoffDate.setMonth(now.getMonth() - 12);
        break;
      default:
        return results;
    }

    return results.filter(result => {
      const resultDate = new Date(result.resultDate);
      return resultDate >= cutoffDate;
    });
  };

  const handleExportDialogOpen = (type: 'pdf' | 'print') => {
    setExportType(type);
    setExportDialogOpen(true);
  };

  const handleExportDialogClose = () => {
    setExportDialogOpen(false);
    setDateRange('all');
  };

  const handleExportConfirm = () => {
    setExportDialogOpen(false);
    if (exportType === 'pdf') {
      generatePDF(dateRange);
    } else {
      handlePrint(dateRange);
    }
    setDateRange('all');
  };

  const generatePDF = (range: string = 'all') => {
    const filteredResults = getFilteredResults(range);
    
    if (!filteredResults || filteredResults.length === 0) {
      alert('Keine Laborwerte zum Exportieren vorhanden für den ausgewählten Zeitraum');
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let yPos = margin;

    // Header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Laborwerte', margin, yPos);
    yPos += 10;

    // Patientendaten
    if (patientInfo) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      const patientName = `${patientInfo.firstName || ''} ${patientInfo.lastName || ''}`.trim();
      if (patientName) {
        doc.text(`Patient: ${patientName}`, margin, yPos);
        yPos += 6;
      }
      if (patientInfo.dateOfBirth) {
        const birthDate = new Date(patientInfo.dateOfBirth).toLocaleDateString('de-DE');
        doc.text(`Geburtsdatum: ${birthDate}`, margin, yPos);
        yPos += 6;
      }
      if (patientInfo.svNumber) {
        doc.text(`SV-Nummer: ${patientInfo.svNumber}`, margin, yPos);
        yPos += 6;
      }
    }
    
    // Zeitraum-Info
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    let rangeText = '';
    switch (range) {
      case 'latest':
        rangeText = 'Zeitraum: Neuester Befund';
        break;
      case '3months':
        rangeText = 'Zeitraum: Letzte 3 Monate';
        break;
      case '6months':
        rangeText = 'Zeitraum: Letzte 6 Monate';
        break;
      case '12months':
        rangeText = 'Zeitraum: Letzte 12 Monate';
        break;
      default:
        rangeText = 'Zeitraum: Alle Befunde';
    }
    doc.text(rangeText, margin, yPos);
    yPos += 8;

    // Sortiere Ergebnisse nach Datum (neueste zuerst)
    const sortedResultsForPDF = [...filteredResults].sort((a, b) => {
      return new Date(b.resultDate).getTime() - new Date(a.resultDate).getTime();
    });

    // Für jedes Ergebnis
    sortedResultsForPDF.forEach((result, resultIndex) => {
      // Prüfe ob neue Seite benötigt wird
      if (yPos > pageHeight - 60) {
        doc.addPage();
        yPos = margin;
      }

      // Ergebnis-Header
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      const resultDate = formatDate(result.resultDate);
      doc.text(`Ergebnis vom ${resultDate}`, margin, yPos);
      yPos += 8;

      if (result.providerId) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Labor: ${result.providerId.name}`, margin, yPos);
        yPos += 6;
      }

      // Gruppiere Tests nach Kategorien
      const testsByCategory = (result.results || []).reduce((acc: any, test: any) => {
        const category = getTestCategory(test);
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(test);
        return acc;
      }, {});

      const categories = Object.keys(testsByCategory).sort();

      // Für jede Kategorie
      categories.forEach((category) => {
        // Prüfe ob neue Seite benötigt wird
        if (yPos > pageHeight - 50) {
          doc.addPage();
          yPos = margin;
        }

        // Kategorie-Header
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(category, margin, yPos);
        yPos += 6;

        // Tabellendaten vorbereiten
        const tableData = testsByCategory[category].map((test: any) => {
          const value = typeof test.value === 'number' 
            ? test.value.toLocaleString('de-DE', { maximumFractionDigits: 2 })
            : test.value;
          const valueWithUnit = test.unit ? `${value} ${test.unit}` : value;
          const reference = formatReferenceRange(test.referenceRange);
          const interpretation = test.interpretation || 'normal';
          const critical = test.isCritical ? ' ⚠️' : '';
          
          return [
            test.testName + critical,
            valueWithUnit,
            reference,
            interpretation
          ];
        });

        // Tabelle erstellen
        autoTable(doc, {
          startY: yPos,
          head: [['Test', 'Wert', 'Referenz', 'Status']],
          body: tableData,
          margin: { left: margin, right: margin },
          styles: { fontSize: 9 },
          headStyles: { fillColor: [25, 118, 210], textColor: 255, fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [245, 245, 245] },
          didParseCell: (data: any) => {
            // Markiere kritische Werte
            if (data.cell.text && data.cell.text[0] && data.cell.text[0].includes('⚠️')) {
              data.cell.styles.fillColor = [255, 235, 238];
            }
          }
        });

        yPos = (doc as any).lastAutoTable.finalY + 10;
      });

      // Interpretation und Kommentare
      if (result.interpretation || result.laboratoryComment) {
        if (yPos > pageHeight - 40) {
          doc.addPage();
          yPos = margin;
        }

        if (result.interpretation) {
          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          doc.text('Interpretation:', margin, yPos);
          yPos += 6;
          doc.setFont('helvetica', 'normal');
          const interpretationLines = doc.splitTextToSize(result.interpretation, pageWidth - 2 * margin);
          doc.text(interpretationLines, margin, yPos);
          yPos += interpretationLines.length * 5 + 3;
        }

        if (result.laboratoryComment) {
          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          doc.text('Labor-Kommentar:', margin, yPos);
          yPos += 6;
          doc.setFont('helvetica', 'normal');
          const commentLines = doc.splitTextToSize(result.laboratoryComment, pageWidth - 2 * margin);
          doc.text(commentLines, margin, yPos);
          yPos += commentLines.length * 5 + 5;
        }
      }

      // Abstand zwischen Ergebnissen
      if (resultIndex < sortedResultsForPDF.length - 1) {
        yPos += 10;
      }
    });

    // Footer auf jeder Seite
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Seite ${i} von ${pageCount} - Erstellt am ${new Date().toLocaleDateString('de-DE')} ${new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
    }

    // PDF speichern
    const fileName = patientInfo 
      ? `Laborwerte_${patientInfo.lastName || ''}_${patientInfo.firstName || ''}_${new Date().toISOString().split('T')[0]}.pdf`
      : `Laborwerte_${patientId}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  };

  const handlePrint = (range: string = 'all') => {
    const filteredResults = getFilteredResults(range);
    
    if (!filteredResults || filteredResults.length === 0) {
      alert('Keine Laborwerte zum Drucken vorhanden für den ausgewählten Zeitraum');
      return;
    }

    // Erstelle ein neues Fenster für den Druck
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Bitte erlauben Sie Pop-ups für diese Seite');
      return;
    }

    // HTML für Druck vorbereiten
    let printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Laborwerte</title>
          <style>
            @media print {
              @page {
                size: A4;
                margin: 1cm;
              }
              body {
                font-family: Arial, sans-serif;
                font-size: 12px;
                color: #000;
              }
              .page-break {
                page-break-after: always;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 20px;
              }
              th, td {
                border: 1px solid #ddd;
                padding: 8px;
                text-align: left;
              }
              th {
                background-color: #1976d2;
                color: white;
                font-weight: bold;
              }
              tr:nth-child(even) {
                background-color: #f5f5f5;
              }
              .critical {
                background-color: #ffebee !important;
                border-left: 3px solid #d32f2f;
              }
              .header {
                margin-bottom: 20px;
                border-bottom: 2px solid #1976d2;
                padding-bottom: 10px;
              }
              .patient-info {
                margin-bottom: 15px;
              }
              .category-header {
                font-weight: bold;
                font-size: 14px;
                color: #1976d2;
                margin-top: 20px;
                margin-bottom: 10px;
                text-transform: uppercase;
              }
              .interpretation {
                margin-top: 15px;
                padding: 10px;
                background-color: #f5f5f5;
                border-left: 3px solid #1976d2;
              }
            }
            body {
              font-family: Arial, sans-serif;
              font-size: 12px;
              color: #000;
              padding: 20px;
            }
            .header {
              margin-bottom: 20px;
              border-bottom: 2px solid #1976d2;
              padding-bottom: 10px;
            }
            .patient-info {
              margin-bottom: 15px;
            }
            .category-header {
              font-weight: bold;
              font-size: 14px;
              color: #1976d2;
              margin-top: 20px;
              margin-bottom: 10px;
              text-transform: uppercase;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: left;
            }
            th {
              background-color: #1976d2;
              color: white;
              font-weight: bold;
            }
            tr:nth-child(even) {
              background-color: #f5f5f5;
            }
            .critical {
              background-color: #ffebee !important;
              border-left: 3px solid #d32f2f;
            }
            .interpretation {
              margin-top: 15px;
              padding: 10px;
              background-color: #f5f5f5;
              border-left: 3px solid #1976d2;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Laborwerte</h1>
    `;

    // Patientendaten
    if (patientInfo) {
      const patientName = `${patientInfo.firstName || ''} ${patientInfo.lastName || ''}`.trim();
      printContent += '<div class="patient-info">';
      if (patientName) {
        printContent += `<p><strong>Patient:</strong> ${patientName}</p>`;
      }
      if (patientInfo.dateOfBirth) {
        const birthDate = new Date(patientInfo.dateOfBirth).toLocaleDateString('de-DE');
        printContent += `<p><strong>Geburtsdatum:</strong> ${birthDate}</p>`;
      }
      if (patientInfo.svNumber) {
        printContent += `<p><strong>SV-Nummer:</strong> ${patientInfo.svNumber}</p>`;
      }
      printContent += '</div>';
    }

    // Zeitraum-Info
    let rangeText = '';
    switch (range) {
      case 'latest':
        rangeText = 'Zeitraum: Neuester Befund';
        break;
      case '3months':
        rangeText = 'Zeitraum: Letzte 3 Monate';
        break;
      case '6months':
        rangeText = 'Zeitraum: Letzte 6 Monate';
        break;
      case '12months':
        rangeText = 'Zeitraum: Letzte 12 Monate';
        break;
      default:
        rangeText = 'Zeitraum: Alle Befunde';
    }
    printContent += `<p><strong>${rangeText}</strong></p>`;

    // Sortiere Ergebnisse nach Datum (neueste zuerst)
    const sortedResultsForPrint = [...filteredResults].sort((a, b) => {
      return new Date(b.resultDate).getTime() - new Date(a.resultDate).getTime();
    });

    // Für jedes Ergebnis
    sortedResultsForPrint.forEach((result, resultIndex) => {
      if (resultIndex > 0) {
        printContent += '<div class="page-break"></div>';
      }

      const resultDate = formatDate(result.resultDate);
      printContent += `<h2>Ergebnis vom ${resultDate}</h2>`;
      
      if (result.providerId) {
        printContent += `<p><strong>Labor:</strong> ${result.providerId.name}</p>`;
      }

      // Gruppiere Tests nach Kategorien
      const testsByCategory = (result.results || []).reduce((acc: any, test: any) => {
        const category = getTestCategory(test);
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(test);
        return acc;
      }, {});

      const categories = Object.keys(testsByCategory).sort();

      // Für jede Kategorie
      categories.forEach((category) => {
        printContent += `<div class="category-header">${category}</div>`;
        printContent += '<table>';
        printContent += '<thead><tr><th>Test</th><th>Wert</th><th>Referenz</th><th>Status</th></tr></thead>';
        printContent += '<tbody>';

        testsByCategory[category].forEach((test: any) => {
          const value = typeof test.value === 'number' 
            ? test.value.toLocaleString('de-DE', { maximumFractionDigits: 2 })
            : test.value;
          const valueWithUnit = test.unit ? `${value} ${test.unit}` : value;
          const reference = formatReferenceRange(test.referenceRange);
          const interpretation = test.interpretation || 'normal';
          const criticalClass = test.isCritical ? ' class="critical"' : '';
          
          printContent += `<tr${criticalClass}>`;
          printContent += `<td>${test.testName}${test.isCritical ? ' ⚠️' : ''}</td>`;
          printContent += `<td>${valueWithUnit}</td>`;
          printContent += `<td>${reference}</td>`;
          printContent += `<td>${interpretation}</td>`;
          printContent += '</tr>';
        });

        printContent += '</tbody></table>';
      });

      // Interpretation und Kommentare
      if (result.interpretation || result.laboratoryComment) {
        printContent += '<div class="interpretation">';
        if (result.interpretation) {
          printContent += `<p><strong>Interpretation:</strong> ${result.interpretation}</p>`;
        }
        if (result.laboratoryComment) {
          printContent += `<p><strong>Labor-Kommentar:</strong> ${result.laboratoryComment}</p>`;
        }
        printContent += '</div>';
      }
    });

    printContent += `
          <div style="margin-top: 30px; text-align: center; font-size: 10px; color: #666;">
            Erstellt am ${new Date().toLocaleDateString('de-DE')} ${new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();

    // Warte kurz, dann öffne Druckdialog
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  // Gruppiere Ergebnisse nach Test
  const groupedResults = (Array.isArray(results) ? results : []).reduce((acc, result) => {
    if (result && Array.isArray(result.results)) {
      result.results.forEach(test => {
        const key = test.loincCode || test.testName;
        if (!acc[key]) {
          acc[key] = {
            testName: test.testName,
            loincCode: test.loincCode,
            unit: test.unit,
            values: []
          };
        }
        acc[key].values.push({
          date: result.resultDate,
          value: test.value,
          interpretation: test.interpretation,
          isCritical: test.isCritical,
          referenceRange: test.referenceRange,
          resultId: result._id
        });
      });
    }
    return acc;
  }, {} as Record<string, any>);

  // Berechne Trend-Daten aus bereits geladenen Ergebnissen
  const getTrendDataForTest = React.useMemo(() => {
    if (!selectedTest) return [];
    
    // Finde den Test in groupedResults
    const testKey = Object.keys(groupedResults).find(
      key => groupedResults[key].loincCode === selectedTest || key === selectedTest
    );
    
    if (!testKey || !groupedResults[testKey]) return [];
    
    const test = groupedResults[testKey];
    const trendData: any[] = [];
    
    // Durchsuche alle Ergebnisse nach diesem Test
    results.forEach((result) => {
      if (result && Array.isArray(result.results)) {
        const testResult = result.results.find((t: any) => 
          (t.loincCode && t.loincCode === test.loincCode) || 
          t.testName === test.testName
        );
        
        if (testResult) {
          // Nur numerische Werte für Trends
          if (typeof testResult.value === 'number') {
            trendData.push({
              date: result.resultDate,
              value: testResult.value,
              unit: testResult.unit || test.unit,
              referenceRange: testResult.referenceRange || test.values[0]?.referenceRange,
              interpretation: testResult.interpretation
            });
          }
        }
      }
    });
    
    // Sortiere nach Datum
    trendData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    return trendData;
  }, [selectedTest, results, groupedResults]);

  // Sortiere Ergebnisse nach Datum (neueste zuerst) - auch wenn leer
  const sortedResults = Array.isArray(results) ? [...results].sort((a, b) => {
    return new Date(b.resultDate).getTime() - new Date(a.resultDate).getTime();
  }) : [];

  // Funktion zur Bestimmung der Labor-Gruppe basierend auf LOINC-Code oder Testname
  const getTestCategory = (test: any): string => {
    const loinc = test.loincCode || '';
    const name = (test.testName || '').toLowerCase();
    
    // Hämatologie (Blutbild)
    if (loinc.includes('789-8') || loinc.includes('718-7') || loinc.includes('777-3') || 
        loinc.includes('6690-2') || name.includes('erythro') || name.includes('hämoglobin') || 
        name.includes('hämatokrit') || name.includes('leukozyt') || name.includes('thrombozyt')) {
      return 'Hämatologie';
    }
    
    // Nierenfunktion
    if (loinc.includes('2160-0') || loinc.includes('33914-3') || 
        name.includes('kreatinin') || name.includes('egfr') || name.includes('gfr')) {
      return 'Nierenfunktion';
    }
    
    // Leberwerte
    if (loinc.includes('1742-6') || loinc.includes('1975-2') || loinc.includes('2324-2') || 
        loinc.includes('1751-7') || name.includes('alt') || name.includes('ast') || 
        name.includes('ggt') || name.includes('bilirubin') || name.includes('albumin')) {
      return 'Leberwerte';
    }
    
    // Elektrolyte
    if (loinc.includes('2823-3') || loinc.includes('2951-2') || loinc.includes('17861-6') || 
        loinc.includes('19123-9') || loinc.includes('2777-1') || 
        name.includes('kalium') || name.includes('natrium') || name.includes('calcium') || 
        name.includes('magnesium') || name.includes('phosphat')) {
      return 'Elektrolyte';
    }
    
    // Lipide
    if (loinc.includes('2093-3') || loinc.includes('2085-9') || loinc.includes('2089-1') || 
        loinc.includes('2571-8') || name.includes('cholesterin') || name.includes('hdl') || 
        name.includes('ldl') || name.includes('triglycerid')) {
      return 'Lipide';
    }
    
    // Schilddrüse
    if (loinc.includes('3053-3') || loinc.includes('3055-8') || name.includes('tsh') || 
        name.includes('t3') || name.includes('t4') || name.includes('thyreo')) {
      return 'Schilddrüse';
    }
    
    // Stoffwechsel
    if (loinc.includes('2339-0') || loinc.includes('4548-4') || loinc.includes('3084-1') || 
        name.includes('glucose') || name.includes('hba1c') || name.includes('harnsäure')) {
      return 'Stoffwechsel';
    }
    
    // Entzündung
    if (loinc.includes('1978-6') || name.includes('crp') || name.includes('c-reaktiv')) {
      return 'Entzündung';
    }
    
    // Vitamine/Mikronährstoffe
    if (loinc.includes('2132-9') || loinc.includes('2284-8') || loinc.includes('2276-4') || 
        name.includes('vitamin') || name.includes('b12') || name.includes('folsäure') || 
        name.includes('ferritin')) {
      return 'Vitamine/Mikronährstoffe';
    }
    
    // Mikrobiologie
    if (name.includes('kultur') || name.includes('bakterien') || name.includes('keim') || 
        name.includes('antibiogramm') || name.includes('resistenz') || name.includes('sensitivity') ||
        name.includes('e.coli') || name.includes('staphylococcus') || name.includes('streptococcus') ||
        name.includes('pcr') || name.includes('antigen') || name.includes('serologie') ||
        loinc.includes('microbiology') || loinc.includes('culture') || loinc.includes('sensitivity')) {
      return 'Mikrobiologie';
    }
    
    return 'Sonstige';
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box 
        display="flex" 
        flexDirection={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between" 
        alignItems={{ xs: 'stretch', sm: 'center' }}
        gap={2}
        mb={2}
      >
        <Tabs value={selectedTab} onChange={(_, newValue) => setSelectedTab(newValue)}>
          <Tab label="Übersicht" />
          <Tab label="Trends" />
        </Tabs>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setManualEntryOpen(true)}
            size="small"
            color="primary"
            sx={{ minWidth: 'auto' }}
          >
            Manuell erfassen
          </Button>
          <Button
            variant="outlined"
            startIcon={<PictureAsPdf />}
            onClick={() => handleExportDialogOpen('pdf')}
            disabled={!results || results.length === 0}
            size="small"
            sx={{ minWidth: 'auto' }}
          >
            PDF herunterladen
          </Button>
          <Button
            variant="outlined"
            startIcon={<Print />}
            onClick={() => handleExportDialogOpen('print')}
            disabled={!results || results.length === 0}
            size="small"
            sx={{ minWidth: 'auto' }}
          >
            Drucken
          </Button>
        </Stack>

        {/* Dialog für Export-Auswahl */}
        <Dialog open={exportDialogOpen} onClose={handleExportDialogClose} maxWidth="sm" fullWidth>
          <DialogTitle>
            {exportType === 'pdf' ? 'PDF herunterladen' : 'Drucken'}
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Wählen Sie den Zeitraum für die {exportType === 'pdf' ? 'PDF-Datei' : 'Druckausgabe'}:
            </Typography>
            <FormControl component="fieldset">
              <FormLabel component="legend">Zeitraum auswählen</FormLabel>
              <RadioGroup
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
              >
                <FormControlLabel value="latest" control={<Radio />} label="Neuester Befund" />
                <FormControlLabel value="all" control={<Radio />} label="Alle Befunde" />
                <FormControlLabel value="3months" control={<Radio />} label="Letzte 3 Monate" />
                <FormControlLabel value="6months" control={<Radio />} label="Letzte 6 Monate" />
                <FormControlLabel value="12months" control={<Radio />} label="Letzte 12 Monate" />
              </RadioGroup>
            </FormControl>
            <Box mt={2}>
              <Typography variant="caption" color="text.secondary">
                {(() => {
                  const filtered = getFilteredResults(dateRange);
                  return `Anzahl der Befunde: ${filtered.length}`;
                })()}
              </Typography>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleExportDialogClose}>Abbrechen</Button>
            <Button onClick={handleExportConfirm} variant="contained" color="primary">
              {exportType === 'pdf' ? 'Herunterladen' : 'Drucken'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>

      {loading && (
        <Box display="flex" justifyContent="center" alignItems="center" p={3}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ m: 2 }}>
          {error}
        </Alert>
      )}

      {selectedTab === 0 && (
        <Box>
          {/* Hinweis wenn kein Patient ausgewählt ist */}
          {!patientId && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Kein Patient ausgewählt. Bitte wählen Sie einen Patienten aus oder verwenden Sie "Manuell erfassen" um Laborwerte für einen beliebigen Patienten zu erfassen.
            </Alert>
          )}
          
          {/* Meldung wenn keine Laborwerte vorhanden sind */}
          {!loading && !error && sortedResults.length === 0 && (
            <Paper sx={{ p: 3, m: 2 }}>
              <Typography variant="body1" color="text.secondary" align="center">
                Keine Laborwerte vorhanden
              </Typography>
              <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1 }}>
                Verwenden Sie den Button "Manuell erfassen" um neue Laborwerte zu erfassen.
              </Typography>
            </Paper>
          )}
          
          {/* Buttons zum Öffnen/Schließen aller Accordions */}
          {sortedResults.length > 0 && (
            <Box display="flex" justifyContent="flex-end" gap={1} mb={2}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<UnfoldMore />}
                onClick={() => {
                  const allExpanded: Record<string, boolean> = {};
                  sortedResults.forEach(result => {
                    if (result._id) allExpanded[result._id] = true;
                  });
                  setExpandedResults(allExpanded);
                  setHasUserInteracted(true);
                }}
              >
                Alle öffnen
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<UnfoldLess />}
                onClick={() => {
                  const allCollapsed: Record<string, boolean> = {};
                  sortedResults.forEach(result => {
                    if (result._id) allCollapsed[result._id] = false;
                  });
                  setExpandedResults(allCollapsed);
                  setHasUserInteracted(true);
                }}
              >
                Alle schließen
              </Button>
            </Box>
          )}

          {sortedResults.map((result) => {
            // Gruppiere Tests nach Kategorien
            const testsByCategory = (result.results || []).reduce((acc: any, test: any) => {
              const category = getTestCategory(test);
              if (!acc[category]) {
                acc[category] = [];
              }
              acc[category].push(test);
              return acc;
            }, {});

            const categories = Object.keys(testsByCategory).sort();
            const resultId = result._id || '';
            // Wenn der Benutzer noch nicht interagiert hat, verwende Standard (kritische Werte geöffnet)
            // Sonst verwende den State-Wert (oder false wenn nicht gesetzt)
            const isExpanded = hasUserInteracted
              ? (expandedResults[resultId] === true)
              : (expandedResults[resultId] !== undefined 
                  ? expandedResults[resultId] 
                  : result.hasCriticalValues);

            return (
              <Accordion 
                key={result._id} 
                expanded={isExpanded}
                onChange={(_, expanded) => {
                  setExpandedResults(prev => ({
                    ...prev,
                    [resultId]: expanded
                  }));
                  setHasUserInteracted(true);
                }}
                sx={{ mb: 2 }}
              >
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box display="flex" alignItems="center" gap={2} sx={{ width: '100%' }}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <CalendarToday fontSize="small" color="action" />
                    <Typography variant="subtitle1" fontWeight="bold">
                      {formatDate(result.resultDate)}
                    </Typography>
                  </Box>
                  {result.providerId && (
                    <Chip
                      label={result.providerId.name}
                      size="small"
                      variant="outlined"
                      icon={<LocalHospital />}
                    />
                  )}
                  {result.hasCriticalValues && (
                    <Chip
                      label="Kritisch"
                      size="small"
                      color="error"
                      icon={<Warning />}
                    />
                  )}
                  {(() => {
                    const source = getSourceLabel(result);
                    return (
                      <Chip
                        label={source.label}
                        size="small"
                        color={source.color}
                        icon={source.label === 'Per Scan' ? <Scanner /> : source.label === 'Manuell' ? <Keyboard /> : undefined}
                        variant="outlined"
                      />
                    );
                  })()}
                  <Chip
                    label={`${result.results.length} Werte`}
                    size="small"
                    variant="outlined"
                  />
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                {isEditable(result) && (
                  <Box display="flex" justifyContent="flex-end" mb={2}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<Edit />}
                      onClick={() => setEditingResult(result)}
                    >
                      Bearbeiten
                    </Button>
                  </Box>
                )}
                {categories.map((category) => (
                  <Box key={category} sx={{ mb: 3 }}>
                    <Typography 
                      variant="subtitle2" 
                      fontWeight="bold" 
                      sx={{ 
                        mb: 1, 
                        color: 'primary.main',
                        textTransform: 'uppercase',
                        letterSpacing: 0.5
                      }}
                    >
                      {category}
                    </Typography>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell><strong>Test</strong></TableCell>
                            <TableCell align="right"><strong>Wert</strong></TableCell>
                            <TableCell align="right"><strong>Referenz</strong></TableCell>
                            <TableCell align="center"><strong>Status</strong></TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {testsByCategory[category].map((test: any, index: number) => (
                            <TableRow 
                              key={index}
                              sx={{
                                ...(test.isCritical ? {
                                  bgcolor: 'error.lighter',
                                  borderLeft: '3px solid',
                                  borderLeftColor: 'error.main'
                                } : {})
                              }}
                            >
                              <TableCell>
                                <Box display="flex" alignItems="center" gap={1}>
                                  {test.isCritical && (
                                    <Warning fontSize="small" color="error" />
                                  )}
                                  <Box>
                                    <Typography variant="body2" fontWeight="medium">
                                      {test.testName}
                                    </Typography>
                                    {test.loincCode && (
                                      <Typography variant="caption" color="text.secondary">
                                        LOINC: {test.loincCode}
                                      </Typography>
                                    )}
                                  </Box>
                                </Box>
                              </TableCell>
                              <TableCell align="right">
                                <Typography 
                                  variant="body2" 
                                  fontWeight="bold"
                                  sx={{
                                    color: test.isCritical 
                                      ? 'error.main' 
                                      : (test.interpretation === 'high' || test.interpretation === 'low')
                                        ? 'warning.dark'
                                        : 'text.primary'
                                  }}
                                >
                                  {typeof test.value === 'number' 
                                    ? test.value.toLocaleString('de-DE', { maximumFractionDigits: 2 })
                                    : test.value}
                                  {test.unit && ` ${test.unit}`}
                                </Typography>
                              </TableCell>
                              <TableCell align="right">
                                <Typography variant="body2" color="text.secondary">
                                  {formatReferenceRange(test.referenceRange)}
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <Tooltip title={test.comment || test.interpretation}>
                                  <Chip
                                    icon={getInterpretationIcon(test.interpretation)}
                                    label={test.interpretation}
                                    size="small"
                                    color={getInterpretationColor(test.interpretation) as any}
                                    variant={test.isCritical ? 'filled' : 'outlined'}
                                    sx={{
                                      ...(test.interpretation === 'high' || test.interpretation === 'low' ? {
                                        bgcolor: test.isCritical ? undefined : 'warning.light',
                                        color: test.isCritical ? undefined : 'warning.dark',
                                        borderColor: 'warning.main'
                                      } : {})
                                    }}
                                  />
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                ))}
                {result.interpretation && (
                  <Box mt={2}>
                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                      Interpretation:
                    </Typography>
                    <Typography variant="body2">{result.interpretation}</Typography>
                  </Box>
                )}
                {result.laboratoryComment && (
                  <Box mt={1}>
                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                      Labor-Kommentar:
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {result.laboratoryComment}
                    </Typography>
                  </Box>
                )}
                
                {/* Bearbeitungshistorie */}
                {result.metadata?.editHistory && result.metadata.editHistory.length > 0 && (
                  <Box mt={2}>
                    <Divider sx={{ my: 2 }} />
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      <History fontSize="small" color="action" />
                      <Typography variant="subtitle2" fontWeight="bold">
                        Bearbeitungshistorie
                      </Typography>
                    </Box>
                    <List dense>
                      {result.metadata.editHistory.map((historyEntry, idx) => (
                        <ListItem key={idx} disablePadding sx={{ flexDirection: 'column', alignItems: 'flex-start', py: 1 }}>
                          <Box display="flex" alignItems="center" gap={1} width="100%">
                            <AccessTime fontSize="small" color="action" />
                            <Typography variant="caption" color="text.secondary">
                              {new Date(historyEntry.editedAt).toLocaleString('de-DE', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </Typography>
                            {historyEntry.editedBy && (
                              <Typography variant="caption" color="text.secondary">
                                von {historyEntry.editedBy.firstName || ''} {historyEntry.editedBy.lastName || ''}
                              </Typography>
                            )}
                          </Box>
                          {historyEntry.changes && Object.keys(historyEntry.changes).length > 0 && (
                            <Box mt={0.5} width="100%">
                              {Object.keys(historyEntry.changes).map((changeKey) => {
                                const change = historyEntry.changes[changeKey];
                                return (
                                  <Box key={changeKey} sx={{ mb: 0.5 }}>
                                    <Typography variant="caption" fontWeight="bold" color="text.secondary">
                                      {changeKey}:
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" component="span" sx={{ ml: 1 }}>
                                      {changeKey === 'results' ? (
                                        `Anzahl Tests: ${change.old?.length || 0} → ${change.new?.length || 0}`
                                      ) : (
                                        `${JSON.stringify(change.old)} → ${JSON.stringify(change.new)}`
                                      )}
                                    </Typography>
                                  </Box>
                                );
                              })}
                            </Box>
                          )}
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}
              </AccordionDetails>
            </Accordion>
            );
          })}
        </Box>
      )}

      {selectedTab === 1 && (
        <Box>
          <Box mb={3}>
            <Typography variant="h6" gutterBottom>
              Trend-Analyse
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Wählen Sie einen Parameter aus, um den Verlauf über die Zeit zu sehen
            </Typography>
            
            {/* Gruppiere Tests nach Kategorien für bessere Übersicht */}
            {(() => {
              const testsByCategory: Record<string, any[]> = {};
              Object.keys(groupedResults).forEach((key) => {
                const test = groupedResults[key];
                // Finde die Kategorie für diesen Test
                const category = getTestCategory({ loincCode: test.loincCode, testName: test.testName });
                if (!testsByCategory[category]) {
                  testsByCategory[category] = [];
                }
                testsByCategory[category].push({ key, ...test });
              });

              return Object.keys(testsByCategory).sort().map((category) => (
                <Box key={category} sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1, color: 'primary.main' }}>
                    {category}
                  </Typography>
                  <Box display="flex" gap={1} flexWrap="wrap">
                    {testsByCategory[category].map((test) => {
                      const testKey = test.loincCode || test.key;
                      const isSelected = selectedTest === testKey;
                      return (
                        <Chip
                          key={test.key}
                          label={test.testName}
                          onClick={() => setSelectedTest(testKey)}
                          color={isSelected ? 'primary' : 'default'}
                          variant={isSelected ? 'filled' : 'outlined'}
                          sx={{
                            cursor: 'pointer',
                            '&:hover': {
                              bgcolor: isSelected ? undefined : 'action.hover'
                            }
                          }}
                        />
                      );
                    })}
                  </Box>
                </Box>
              ));
            })()}
          </Box>

          {selectedTest && (
            <Card>
              <CardContent>
                {getTrendDataForTest.length > 0 ? (
                  <Box>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                      <Typography variant="h6">
                        {groupedResults[Object.keys(groupedResults).find(k => 
                          groupedResults[k].loincCode === selectedTest || k === selectedTest
                        ) || '']?.testName || 'Trend'}
                      </Typography>
                      <Chip 
                        label={`${getTrendDataForTest.length} Messwerte`} 
                        size="small" 
                        variant="outlined" 
                      />
                    </Box>
                    <ResponsiveContainer width="100%" height={400}>
                      <LineChart data={getTrendDataForTest} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={(value) => new Date(value).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
                          stroke="#666"
                        />
                        <YAxis 
                          label={{ value: getTrendDataForTest[0]?.unit || '', angle: -90, position: 'insideLeft' }}
                          stroke="#666"
                        />
                        <RechartsTooltip 
                          formatter={(value: any, name: string) => [
                            `${typeof value === 'number' ? value.toLocaleString('de-DE', { maximumFractionDigits: 2 }) : value} ${getTrendDataForTest[0]?.unit || ''}`,
                            'Wert'
                          ]}
                          labelFormatter={(label) => new Date(label).toLocaleDateString('de-DE', { 
                            day: '2-digit', 
                            month: '2-digit', 
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                          contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #ccc' }}
                        />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="value" 
                          stroke="#1976d2" 
                          strokeWidth={3}
                          dot={{ r: 5, fill: '#1976d2' }}
                          activeDot={{ r: 7 }}
                          name="Messwert"
                        />
                        {getTrendDataForTest[0]?.referenceRange?.low !== undefined && (
                          <ReferenceLine 
                            y={getTrendDataForTest[0].referenceRange.low} 
                            stroke="#ff9800" 
                            strokeDasharray="5 5"
                            strokeWidth={2}
                            label={{ value: "Untergrenze", position: "insideBottomLeft" }}
                          />
                        )}
                        {getTrendDataForTest[0]?.referenceRange?.high !== undefined && (
                          <ReferenceLine 
                            y={getTrendDataForTest[0].referenceRange.high} 
                            stroke="#ff9800" 
                            strokeDasharray="5 5"
                            strokeWidth={2}
                            label={{ value: "Obergrenze", position: "insideTopLeft" }}
                          />
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                    {getTrendDataForTest[0]?.referenceRange && (
                      <Box mt={2}>
                        <Typography variant="caption" color="text.secondary">
                          Referenzbereich: {formatReferenceRange(getTrendDataForTest[0].referenceRange)}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                ) : (
                  <Box textAlign="center" py={4}>
                    <Typography variant="body2" color="text.secondary">
                      Keine Trend-Daten verfügbar für diesen Parameter
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      Es sind mindestens zwei Messwerte erforderlich, um einen Trend anzuzeigen
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          )}
        </Box>
      )}
      
          {/* Manuelle Eingabe Dialog */}
          <ManualLaborEntry
            open={manualEntryOpen || editingResult !== null}
            onClose={() => {
              setManualEntryOpen(false);
              setEditingResult(null);
            }}
            patientId={patientId}
            onSave={() => {
              if (patientId) {
                fetchLaborResults();
              }
              setEditingResult(null);
            }}
            editingResult={editingResult || undefined}
          />
    </Box>
  );
};

export default LaborResults;

