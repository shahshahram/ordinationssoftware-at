import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Stack,
  Chip,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Autocomplete
} from '@mui/material';
import {
  Close,
  Print,
  Save,
  Delete,
  Edit,
  Add,
  CheckCircle
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { createDocument, updateDocument } from '../store/slices/documentSlice';
import { fetchDocuments } from '../store/slices/documentSlice';
import { fetchDekursEntries, DekursEntry } from '../store/slices/dekursSlice';
import { Location } from '../store/slices/locationSlice';
import { Patient } from '../store/slices/patientSlice';
import { fetchContacts, Contact } from '../store/slices/contactSlice';
import { apiRequest } from '../utils/api';
import api from '../utils/api';
import RichTextEditor from './RichTextEditor';
import DataSourceSelector from './DataSourceSelector';
import DocumentVersionHistory from './DocumentVersionHistory';
import DocumentVersionComparison from './DocumentVersionComparison';
import { replacePlaceholders, PlaceholderContext } from '../utils/placeholders';
import { Document, createNewVersion, getDocumentVersion, compareVersions } from '../store/slices/documentSlice';
import { DocumentTemplate, fetchStandaloneTemplate } from '../store/slices/documentTemplateSlice';

interface StandaloneDocumentDialogProps {
  open: boolean;
  onClose: () => void;
  patient: Patient | null;
  location: Location | null;
  templateId: string | null;
  documentId?: string | null; // Für Bearbeitungsmodus
  document?: Document | null; // Optional: Dokument direkt übergeben
  onSaveSuccess?: (documentId?: string) => void;
}

const StandaloneDocumentDialog: React.FC<StandaloneDocumentDialogProps> = ({
  open,
  onClose,
  patient,
  location,
  templateId,
  documentId,
  document: initialDocument,
  onSaveSuccess
}) => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(state => state.auth.user);
  const dekursEntries = useAppSelector(state => state.dekurs.entries);

  // State für Template
  const [template, setTemplate] = useState<DocumentTemplate | null>(null);
  const [loadingTemplate, setLoadingTemplate] = useState(false);

  // State für Arztauswahl
  const [availableDoctors, setAvailableDoctors] = useState<any[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<any | null>(null);
  const [loadingDoctors, setLoadingDoctors] = useState(false);

  // State für Empfänger
  const [recipient, setRecipient] = useState<{
    type: 'patient' | 'doctor' | 'organization' | 'contact' | null;
    contactId?: string;
    name?: string;
    title?: string;
    salutation?: string;
    organization?: string;
    address?: {
      street?: string;
      postalCode?: string;
      city?: string;
      country?: string;
    };
    phone?: string;
    email?: string;
    fax?: string;
  } | null>(null);
  const [availableContacts, setAvailableContacts] = useState<Contact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);

  // State für Dokumentinhalt
  const [documentContent, setDocumentContent] = useState<string>('');
  const [processedContent, setProcessedContent] = useState<string>('');
  const [placeholdersResolved, setPlaceholdersResolved] = useState(false);

  // State für zu bearbeitendes Dokument (muss vor isEditMode deklariert werden)
  const [editingDocument, setEditingDocument] = useState<Document | null>(initialDocument || null);
  const isEditMode = !!(documentId || initialDocument);
  
  // Debug: Log Edit-Modus Status
  useEffect(() => {
    if (open) {
      console.log('[StandaloneDocumentDialog] Edit-Modus Status:', {
        isEditMode,
        documentId,
        hasInitialDocument: !!initialDocument,
        hasEditingDocument: !!editingDocument,
        editingDocumentStatus: editingDocument?.status,
        editingDocumentId: editingDocument?._id || editingDocument?.id
      });
    }
  }, [open, isEditMode, documentId, initialDocument, editingDocument]);

  // State für Datenquelle-Auswahl
  const [dataSourceSelectorOpen, setDataSourceSelectorOpen] = useState(false);
  // Im Bearbeitungsmodus: 'manual' (Dokumentinhalt wird direkt geladen)
  // Im Erstellungsmodus: 'dekurs' (Standard)
  const [selectedDataSource, setSelectedDataSource] = useState<'dekurs' | 'document' | 'manual'>(
    isEditMode ? 'manual' : 'dekurs'
  );
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [latestDekursEntry, setLatestDekursEntry] = useState<DekursEntry | null>(null);

  // State für Speichern
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State für Tabs
  const [activeTab, setActiveTab] = useState(0);

  // State für Status und Priorität (nur im Bearbeitungsmodus)
  const [documentStatus, setDocumentStatus] = useState<'draft' | 'ready' | 'sent' | 'received' | 'archived' | 'under_review' | 'released' | 'withdrawn'>('draft');
  const [documentPriority, setDocumentPriority] = useState<'niedrig' | 'normal' | 'hoch' | 'dringend'>('normal');

  // State für Versions-Anzeige und Vergleich
  const [viewVersionDialogOpen, setViewVersionDialogOpen] = useState(false);
  const [viewingVersion, setViewingVersion] = useState<any | null>(null);
  const [compareVersionsDialogOpen, setCompareVersionsDialogOpen] = useState(false);
  const [comparingVersions, setComparingVersions] = useState<[string | null, string | null]>([null, null]);

  // Lade Dokument im Bearbeitungsmodus
  useEffect(() => {
    const loadDocument = async () => {
      if (!isEditMode || !open) {
        console.log('[StandaloneDocumentDialog] Skipping document load:', { isEditMode, open });
        return;
      }
      
      // Verwende documentId aus initialDocument oder aus Prop
      const docIdToLoad = documentId || initialDocument?._id || initialDocument?.id;
      
      console.log('[StandaloneDocumentDialog] Loading document:', { 
        hasInitialDocument: !!initialDocument, 
        documentId,
        docIdToLoad,
        initialDocumentId: initialDocument?._id || initialDocument?.id,
        hasContentInInitial: !!initialDocument?.content?.html
      });
      
      // Wenn eine documentId vorhanden ist, IMMER das vollständige Dokument über die API laden
      // initialDocument könnte unvollständig sein (z.B. ohne content.html)
      if (docIdToLoad) {
        console.log('[StandaloneDocumentDialog] Lade vollständiges Dokument über API, auch wenn initialDocument vorhanden ist');
        
        try {
          console.log('[StandaloneDocumentDialog] Fetching document from API:', docIdToLoad);
          const response: any = await apiRequest.get(`/documents/${docIdToLoad}`);
          const doc = response.data?.data || response.data;
          console.log('[StandaloneDocumentDialog] Loaded document:', {
            id: doc._id || doc.id,
            status: doc.status,
            templateId: doc.templateId,
            hasContent: !!doc.content?.html
          });
          setEditingDocument(doc);
          
          // Lade Template aus dem Dokument oder aus Prop (optional)
          // Wenn kein Template vorhanden ist, kann das Dokument trotzdem bearbeitet werden
          const docTemplateId = doc.templateId || templateId;
          if (docTemplateId) {
            try {
              const result = await dispatch(fetchStandaloneTemplate(docTemplateId)).unwrap();
              setTemplate(result);
            } catch (error) {
              console.warn('[StandaloneDocumentDialog] Template konnte nicht geladen werden, aber Dokument kann trotzdem bearbeitet werden:', error);
              // Kein Fehler setzen - Dokument kann auch ohne Template bearbeitet werden
            }
          } else {
            console.log('[StandaloneDocumentDialog] Kein Template vorhanden - Dokument kann trotzdem bearbeitet werden');
          }
          
          // Lade Dokumentinhalt
          if (doc.content?.html) {
            // Entferne ALLE Briefköpfe und Datumszeilen aus dem geladenen Content
            const contentWithoutLetterhead = removeLetterheadAndDates(doc.content.html);
            if (contentWithoutLetterhead !== doc.content.html) {
              console.log('[StandaloneDocumentDialog] Briefkopf(e) und Datumszeilen aus geladenem Dokument entfernt');
            }
            setDocumentContent(contentWithoutLetterhead);
            setPlaceholdersResolved(true); // Inhalt ist bereits aufgelöst
          } else {
            console.warn('[StandaloneDocumentDialog] Geladenes Dokument hat keinen Content. Template wird geladen, aber Dokument-Inhalt fehlt.');
            // Wenn kein Content vorhanden ist, wird das Template-Inhalt verwendet (falls Template geladen wurde)
          }
          
          // Lade Empfänger
          if (doc.recipient) {
            setRecipient(doc.recipient);
          }
          
          // Lade Status und Priorität
          if (doc.status) {
            setDocumentStatus(doc.status);
          }
          if (doc.priority) {
            setDocumentPriority(doc.priority);
          }
        } catch (error) {
          console.error('Fehler beim Laden des Dokuments:', error);
          setError('Fehler beim Laden des Dokuments');
        }
      } else {
        console.log('[StandaloneDocumentDialog] No documentId provided');
      }
    };
    
    loadDocument();
  }, [open, documentId, isEditMode, initialDocument, dispatch]);

  // Synchronisiere documentStatus mit editingDocument.status
  useEffect(() => {
    if (editingDocument?.status) {
      console.log('[StandaloneDocumentDialog] Synchronisiere documentStatus mit editingDocument.status:', editingDocument.status);
      setDocumentStatus(editingDocument.status);
    }
  }, [editingDocument?.status]);

  // Lade Template (auch im Bearbeitungsmodus, wenn noch kein Template geladen wurde)
  useEffect(() => {
    const loadTemplate = async () => {
      // Überspringe, wenn kein templateId vorhanden ist oder Dialog nicht offen ist
      if (!templateId || !open) {
        console.log('[StandaloneDocumentDialog] Skipping template load:', { templateId, open });
        return;
      }
      
      // Im Edit-Modus nur laden, wenn noch kein Template vorhanden ist
      if (isEditMode && template) {
        console.log('[StandaloneDocumentDialog] Skipping template load - already loaded in edit mode');
        return;
      }

      // Überspringe, wenn Template bereits geladen ist (verhindert Endlosschleife)
      if (template && template._id === templateId) {
        console.log('[StandaloneDocumentDialog] Skipping template load - already loaded');
        return;
      }

      console.log('[StandaloneDocumentDialog] Loading template with ID:', templateId);
      setLoadingTemplate(true);
      setError(null);
      try {
        const result = await dispatch(fetchStandaloneTemplate(templateId)).unwrap();
        console.log('[StandaloneDocumentDialog] Template loaded successfully:', result.name);
        setTemplate(result);
        
        // Setze initialen Inhalt nur, wenn noch kein Dokument-Inhalt vorhanden ist
        // (im Edit-Modus sollte der Dokument-Inhalt Vorrang haben)
        if (result.content && !isEditMode) {
          setDocumentContent(result.content);
        }

        // Reset Platzhalter-Status beim Laden eines neuen Templates (nur im Erstellungsmodus)
        if (!isEditMode) {
          setPlaceholdersResolved(false);
        }

        // Setze Standard-Empfänger wenn definiert
        if (result.defaultRecipientType) {
          setRecipient({
            type: result.defaultRecipientType,
            name: '',
            address: {}
          });
        }
      } catch (err: any) {
        console.error('[StandaloneDocumentDialog] Error loading template:', err);
        const errorMessage = err.message || err.error || 'Fehler beim Laden der Vorlage';
        
        // Im Edit-Modus ohne Template ist das kein kritischer Fehler
        // Der Dialog kann trotzdem verwendet werden, um das Dokument zu bearbeiten
        if (isEditMode) {
          console.warn('[StandaloneDocumentDialog] Template konnte nicht geladen werden, aber Dokument kann trotzdem bearbeitet werden');
          setError(null); // Kein Fehler setzen, damit der Dialog funktioniert
        } else {
          // Im Erstellungsmodus ist ein Template erforderlich
          setError(errorMessage);
          alert(`Fehler beim Laden der Vorlage: ${errorMessage}`);
        }
      } finally {
        setLoadingTemplate(false);
      }
    };

    loadTemplate();
  }, [templateId, open, dispatch, isEditMode]); // template entfernt aus Dependencies

  // Lade Ärzte
  useEffect(() => {
    const loadDoctors = async () => {
      if (!location?._id || !open) return;
      
      setLoadingDoctors(true);
      try {
        const response: any = await apiRequest.get(`/staff-location-assignments/location/${location._id}`);
        const assignments = response.data?.data || response.data || [];
        
        const doctors: any[] = [];
        for (const assignment of assignments) {
          if (assignment.staff_id?.userId) {
            const userData = assignment.staff_id.userId;
            if (userData.role === 'doctor' || userData.role === 'arzt' || userData.title) {
              doctors.push({
                _id: userData._id || userData.id,
                firstName: userData.firstName,
                lastName: userData.lastName,
                title: userData.title,
                email: userData.email,
                phone: userData.phone,
                specialization: userData.specialization
              });
            }
          }
        }
        
        setAvailableDoctors(doctors);
        if (doctors.length > 0) {
          setSelectedDoctor(doctors[0]);
        }
      } catch (error) {
        console.error('Fehler beim Laden der Ärzte:', error);
      } finally {
        setLoadingDoctors(false);
      }
    };

    loadDoctors();
  }, [open, location]);

  // Lade Kontakte
  useEffect(() => {
    const loadContacts = async () => {
      if (!open) return;
      
      setLoadingContacts(true);
      try {
        const response: any = await apiRequest.get('/contacts?limit=500&isActive=true');
        const contacts = response.data?.data || [];
        setAvailableContacts(contacts);
      } catch (error) {
        console.error('Fehler beim Laden der Kontakte:', error);
      } finally {
        setLoadingContacts(false);
      }
    };

    loadContacts();
  }, [open, dispatch]);

  // Lade Daten basierend auf ausgewählter Datenquelle
  useEffect(() => {
    const loadData = async () => {
      if (!open || !patient?._id || !template) return;

      if (selectedDataSource === 'manual') {
        return;
      }

      if (selectedDataSource === 'document' && selectedDocument) {
        // Lade Daten aus bestehendem Dokument
        if (selectedDocument.content?.html) {
          setDocumentContent(selectedDocument.content.html);
          // Dokument-Inhalt ist bereits aufgelöst, keine Platzhalter mehr
          setPlaceholdersResolved(true);
        }
        return;
      }

      if (selectedDataSource === 'dekurs') {
        // Lade neuesten Dekurs-Eintrag
        try {
          const response: any = await apiRequest.get(`/dekurs/patient/${patient._id}?limit=1&sort=desc`);
          const entries = response.data?.data || [];
          if (entries.length > 0) {
            setLatestDekursEntry(entries[0]);
          }
        } catch (error) {
          console.error('Fehler beim Laden des Dekurs:', error);
        }
      }
    };

    loadData();
  }, [open, patient, selectedDataSource, selectedDocument, template]);

  // Verarbeite Platzhalter und übernehme aufgelösten Inhalt in Editor
  useEffect(() => {
    if (!template || !patient || !user || !location) return;

    // Im Bearbeitungsmodus: Keine Platzhalter auflösen, Dokumentinhalt ist bereits vorhanden
    if (isEditMode) {
      setPlaceholdersResolved(true);
      return;
    }

    // Wenn manuell, keine Platzhalter auflösen
    if (selectedDataSource === 'manual') {
      setPlaceholdersResolved(true);
      return;
    }

    // Wenn noch keine Datenquelle ausgewählt oder noch keine Daten geladen, warten
    if (selectedDataSource === 'dekurs' && !latestDekursEntry) return;
    if (selectedDataSource === 'document' && !selectedDocument) return;

    // Wenn Platzhalter bereits aufgelöst wurden, zeige Editor-Inhalt direkt in Vorschau
    // (keine erneute Platzhalter-Auflösung, da der Inhalt bereits bearbeitbar ist)
    if (placeholdersResolved) {
      setProcessedContent(documentContent);
      return;
    }

    // Initial: Lade Template-Inhalt und löse Platzhalter auf
    const templateContent = template?.content || '';
    
    // Debug: Prüfe Patientendaten
    console.log('[StandaloneDocumentDialog] Patient data:', {
      patientId: patient?._id,
      patientName: patient ? `${patient.firstName} ${patient.lastName}` : 'N/A',
      socialSecurityNumber: patient?.socialSecurityNumber || 'NICHT VORHANDEN',
      hasSocialSecurityNumber: !!patient?.socialSecurityNumber
    });
    
    // Debug: Prüfe Template-Inhalt auf SVNR-Platzhalter
    const svnrPlaceholders = [
      '{{patient.socialSecurityNumber}}',
      '{{patient.svnr}}',
      '{{patient.socialSecurityNumber.full}}'
    ];
    const foundPlaceholders = svnrPlaceholders.filter(ph => templateContent.includes(ph));
    if (foundPlaceholders.length > 0) {
      console.log('[StandaloneDocumentDialog] SVNR-Platzhalter gefunden:', foundPlaceholders);
    }
    
    const context: PlaceholderContext = {
      patient,
      doctor: selectedDoctor ? {
        firstName: selectedDoctor.firstName,
        lastName: selectedDoctor.lastName,
        title: selectedDoctor.title,
        specialization: selectedDoctor.specialization,
        email: selectedDoctor.email,
        phone: selectedDoctor.phone
      } : {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email
      },
      location,
      date: new Date(),
      dekurs: latestDekursEntry || undefined,
      document: selectedDocument || undefined,
      dataSource: selectedDataSource,
      dataSourceInfo: latestDekursEntry ? {
        type: 'dekurs',
        id: latestDekursEntry._id || latestDekursEntry.id || '',
        date: new Date(latestDekursEntry.entryDate),
        modified: false
      } : undefined
    };

    const processed = replacePlaceholders(templateContent, context);
    setProcessedContent(processed);
    // Übernehme aufgelösten Inhalt in Editor, damit er bearbeitbar ist
    setDocumentContent(processed);
    setPlaceholdersResolved(true);
  }, [template, patient, user, location, selectedDoctor, latestDekursEntry, selectedDocument, selectedDataSource, placeholdersResolved, documentContent]);

  // Reset-Funktion
  const handleClose = () => {
    setPlaceholdersResolved(false);
    setDocumentContent('');
    setProcessedContent('');
    setSelectedDataSource('dekurs');
    setSelectedDocument(null);
    setLatestDekursEntry(null);
    setError(null);
    onClose();
  };

  // Öffne Datenquelle-Auswahl beim Öffnen (nur im Erstellungsmodus, nicht im Bearbeitungsmodus)
  useEffect(() => {
    if (open && patient?._id && template && !isEditMode) {
      setDataSourceSelectorOpen(true);
    }
  }, [open, patient, template, isEditMode]);

  // Template-Auswahl basierend auf Dokumenttyp und Standort-Einstellungen
  // Priorität: 1. Template-spezifische Einstellung, 2. Standort-Einstellung für Dokumenttyp, 3. Standard
  const getSelectedTemplate = (): 'template1' | 'template2' | 'template3' | 'custom' => {
    // Priorität 1: Template-spezifische Briefkopf-Vorlage (falls gesetzt)
    if (template?.letterheadTemplate) {
      return template.letterheadTemplate as 'template1' | 'template2' | 'template3' | 'custom';
    }
    
    // Priorität 2: Standort-Einstellung für Dokumenttyp
    const docType = template?.documentType || 'sonstiges';
    const templates = location?.letterheadTemplates;
    const templateKey = templates?.[docType] || templates?.['all'];
    
    // Priorität 3: Standard
    return templateKey || 'template1';
  };

  // Hilfsfunktion: Entfernt ALLE Briefköpfe und Datumszeilen aus dem Content
  const removeLetterheadAndDates = (content: string): string => {
    if (!content) return content;
    
    let cleaned = content;
    let iterations = 0;
    const maxIterations = 50; // Sicherheitsschleife
    
    // Debug: Zähle initiale Briefköpfe, Datumszeilen und Logos
    const initialLetterheadCount = (cleaned.match(/class=["']letterhead["']/gi) || []).length;
    const today = new Date();
    const todayStr = today.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const initialDateCount = (cleaned.match(new RegExp(todayStr.replace(/\./g, '\\.'), 'gi')) || []).length;
    const initialLogoCount = (cleaned.match(/<img[^>]*(?:logo|location-logos|data:image)[^>]*>/gi) || []).length;
    const initialLogoContainerCount = (cleaned.match(/class=["']logo-container["']/gi) || []).length;
    
    if (initialLetterheadCount > 0 || initialDateCount > 0 || initialLogoCount > 0 || initialLogoContainerCount > 0) {
      console.log(`[removeLetterheadAndDates] Start: ${initialLetterheadCount} Briefköpfe, ${initialDateCount} Datumszeilen, ${initialLogoCount} Logos, ${initialLogoContainerCount} Logo-Container gefunden`);
    }
    
    // Entferne alle Briefköpfe und Datumszeilen (wiederholt, bis keine mehr gefunden werden)
    while (iterations < maxIterations) {
      const beforeCleaning = cleaned;
      iterations++;
      
      // 1. Entferne Briefköpfe mit verschiedenen möglichen Formaten (auch verschachtelt)
      // Entferne zuerst verschachtelte Briefköpfe, dann einfache
      cleaned = cleaned
        // Verschachtelte Briefköpfe (div mit letterhead class, der andere divs enthält)
        .replace(/<div[^>]*class=["']letterhead["'][^>]*>[\s\S]*?<\/div>\s*<\/div>/gi, '')
        // Einfache Briefköpfe
        .replace(/<div[^>]*class=["']letterhead["'][^>]*>[\s\S]*?<\/div>/gi, '')
        // Briefköpfe mit verschiedenen Anführungszeichen
        .replace(/<div[^>]*class=['"]letterhead['"][^>]*>[\s\S]*?<\/div>/gi, '');
      
      // 2. Entferne letterhead-top, letterhead-date, letterhead-bottom Elemente
      cleaned = cleaned
        .replace(/<div[^>]*class=["']letterhead-(?:top|date|bottom)["'][^>]*>[\s\S]*?<\/div>/gi, '')
        .replace(/<div[^>]*class=['"]letterhead-(?:top|date|bottom)['"][^>]*>[\s\S]*?<\/div>/gi, '');
      
      // 2a. Entferne isolierte Logo-Container, die möglicherweise außerhalb des Briefkopfes sind
      // (nur wenn sie nicht Teil eines Briefkopfes sind - das wird durch Schritt 1 bereits entfernt)
      // Aber falls sie isoliert sind, entferne sie auch
      cleaned = cleaned
        .replace(/<div[^>]*class=["']logo-container["'][^>]*>[\s\S]*?<\/div>/gi, '')
        .replace(/<div[^>]*class=['"]logo-container['"][^>]*>[\s\S]*?<\/div>/gi, '');
      
      // 2b. Entferne isolierte Logo-Images, die möglicherweise außerhalb des Briefkopfes sind
      // Entferne alle img-Tags, die auf Logo-Dateien verweisen (location-logos, logo, etc.)
      // Oder Base64-Logos (data:image)
      // Aber nur, wenn sie nicht in einem Briefkopf-Kontext stehen (was bereits entfernt wurde)
      cleaned = cleaned
        .replace(/<img[^>]*src=["'][^"']*(?:logo|location-logos|data:image)[^"']*["'][^>]*>/gi, '')
        .replace(/<img[^>]*src=['"][^"']*(?:logo|location-logos|data:image)[^"']*['"][^>]*>/gi, '');
      
      // 3. Entferne alle Datumszeilen (DD.MM.YYYY Format)
      const escapedDate = todayStr.replace(/\./g, '\\.');
      
      // Entferne Datum in verschiedenen HTML-Formaten
      cleaned = cleaned
        // Als reine Textzeile (mit optionalem Whitespace)
        .replace(new RegExp(`^\\s*${escapedDate}\\s*$`, 'gmi'), '')
        // In <p> Tags
        .replace(new RegExp(`<p[^>]*>\\s*${escapedDate}\\s*</p>`, 'gi'), '')
        // In <div> Tags
        .replace(new RegExp(`<div[^>]*>\\s*${escapedDate}\\s*</div>`, 'gi'), '')
        // In <span> Tags
        .replace(new RegExp(`<span[^>]*>\\s*${escapedDate}\\s*</span>`, 'gi'), '')
        // In <h1>-<h6> Tags
        .replace(new RegExp(`<h[1-6][^>]*>\\s*${escapedDate}\\s*</h[1-6]>`, 'gi'), '')
        // Datum gefolgt von Zeilenumbrüchen (auch mehrfach)
        .replace(new RegExp(`${escapedDate}\\s*[\\r\\n]+`, 'gi'), '')
        // Mehrfache aufeinanderfolgende Datumszeilen (2-50 mal)
        .replace(new RegExp(`(${escapedDate}\\s*[\\r\\n]+){2,50}`, 'gi'), '');
      
      // 4. Entferne auch Briefkopf-ähnliche Strukturen (wiederholte Arztnamen, Adressen, etc.)
      // Suche nach wiederholten Briefkopf-Mustern - entferne alles zwischen Arztname und Datum
      const letterheadPatterns = [
        // Arztname gefolgt von Adresse/Telefon/E-Mail und dann Datum
        /(?:Admin Administrator|Dr\.\s+[^\n]+|Hauptstraße\s+\d+)[\s\S]{0,500}?\d{2}\.\d{2}\.\d{4}/gi,
        // E-Mail-Adressen gefolgt von Datum
        /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}[\s\S]{0,200}?\d{2}\.\d{2}\.\d{4}/gi,
        // Telefonnummern gefolgt von Datum
        /Tel\.:\s*[\d\s\+\-]+[\s\S]{0,200}?\d{2}\.\d{2}\.\d{4}/gi,
        // Web-Adressen gefolgt von Datum
        /Web:\s*[^\n]+[\s\S]{0,200}?\d{2}\.\d{2}\.\d{4}/gi,
      ];
      
      letterheadPatterns.forEach(pattern => {
        let patternRemoved = true;
        let patternIterations = 0;
        while (patternRemoved && patternIterations < 10) {
          const beforePattern = cleaned;
          cleaned = cleaned.replace(pattern, '');
          patternRemoved = (beforePattern !== cleaned);
          patternIterations++;
        }
      });
      
      // 5. Entferne isolierte Datumszeilen, die möglicherweise vom Briefkopf übrig geblieben sind
      // Suche nach Datumszeilen, die alleine stehen (mit optionalem Whitespace davor/danach)
      cleaned = cleaned.replace(new RegExp(`(?:^|\\n)\\s*${escapedDate}\\s*(?:\\n|$)`, 'gmi'), '\n');
      
      // 6. Entferne auch Datumszeilen, die in verschiedenen Formaten vorkommen können
      // DD.MM.YYYY, DD.MM.YY, etc.
      const datePatterns = [
        /\d{2}\.\d{2}\.\d{4}/g,  // DD.MM.YYYY
        /\d{2}\.\d{2}\.\d{2}/g,  // DD.MM.YY
      ];
      
      // Entferne isolierte Datumszeilen (nur Datum, keine anderen Zeichen)
      datePatterns.forEach(datePattern => {
        cleaned = cleaned.replace(new RegExp(`(?:^|\\n|<p[^>]*>|<div[^>]*>|<span[^>]*>)\\s*(${datePattern.source})\\s*(?:\\n|</p>|</div>|</span>|$)`, 'gmi'), '\n');
      });
      
      // 7. Entferne leere Zeilen und Whitespace
      cleaned = cleaned
        .replace(/^\s*[\r\n]+/gm, '') // Leere Zeilen am Anfang
        .replace(/[\r\n]+\s*$/gm, '') // Leere Zeilen am Ende
        .replace(/([\r\n]){3,}/g, '\n\n') // Mehr als 2 aufeinanderfolgende Zeilenumbrüche
        .replace(/^\s+|\s+$/gm, '') // Whitespace am Anfang/Ende jeder Zeile
        .trim();
      
      // Wenn sich nichts mehr geändert hat, beende die Schleife
      if (beforeCleaning === cleaned) {
        break;
      }
    }
    
    // Debug: Zähle verbleibende Briefköpfe, Datumszeilen und Logos
    const finalLetterheadCount = (cleaned.match(/class=["']letterhead["']/gi) || []).length;
    const finalDateCount = (cleaned.match(new RegExp(todayStr.replace(/\./g, '\\.'), 'gi')) || []).length;
    const finalLogoCount = (cleaned.match(/<img[^>]*(?:logo|location-logos|data:image)[^>]*>/gi) || []).length;
    const finalLogoContainerCount = (cleaned.match(/class=["']logo-container["']/gi) || []).length;
    
    if (initialLetterheadCount > 0 || initialDateCount > 0 || initialLogoCount > 0 || initialLogoContainerCount > 0) {
      console.log(`[removeLetterheadAndDates] Ende: ${finalLetterheadCount} Briefköpfe, ${finalDateCount} Datumszeilen, ${finalLogoCount} Logos, ${finalLogoContainerCount} Logo-Container verbleibend (${iterations} Iterationen)`);
      if (finalLogoCount > 0 || finalLogoContainerCount > 0) {
        console.warn(`[removeLetterheadAndDates] WARNUNG: ${finalLogoCount} Logo(s) und ${finalLogoContainerCount} Logo-Container noch vorhanden!`);
      }
    }
    
    return cleaned;
  };

  // Briefkopf-Generierung
  const generateLetterhead = (logoUrlOrBase64: string | null, templateType: 'template1' | 'template2' | 'template3' | 'custom'): string => {
    const doctorName = selectedDoctor 
      ? `${selectedDoctor.title || ''} ${selectedDoctor.firstName || ''} ${selectedDoctor.lastName || ''}`.trim()
      : user 
        ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
        : '';
    const phone = selectedDoctor?.phone || location?.owner?.phone || location?.phone;
    const email = selectedDoctor?.email || location?.owner?.email || location?.email;
    const website = selectedDoctor?.website || location?.owner?.website;
    const address = location ? `${location.address_line1}${location.address_line2 ? ', ' + location.address_line2 : ''}` : '';
    const postalCity = location ? `${location.postal_code || ''} ${location.city || ''}`.trim() : '';
    const date = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

    let html = '<div class="letterhead" style="margin-bottom: 30px; border-bottom: 2px solid #ddd; padding-bottom: 15px;">';

    switch (templateType) {
      case 'template1':
        // Vorlage 1: Logo links, Arzt rechts
        html += '<div class="letterhead-top" style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:20px;">';
        html += '<div class="logo-container" style="flex:0 0 auto;">';
        if (logoUrlOrBase64) {
          html += `<img src="${logoUrlOrBase64}" alt="${location?.name || ''}" onerror="this.style.display='none';" style="max-height:100px; max-width:250px;" />`;
        } else if (location?.name) {
          html += `<h2 style="margin:0; font-size:18pt; color:#2c3e50;">${location.name}</h2>`;
        }
        html += '</div>';
        html += '<div style="text-align:right; flex:0 0 auto;">';
        html += `<div class="letterhead-date" style="font-size:10pt; color:#555; margin-bottom:10px;">${date}</div>`;
        if (doctorName) {
          html += `<div class="doctor-name" style="font-weight:bold; color:#2c3e50; margin-bottom:5px;">${doctorName}</div>`;
        }
        if (address) html += `<div class="address-line" style="font-size:10pt; margin:2px 0;">${address}</div>`;
        if (postalCity) html += `<div class="address-line" style="font-size:10pt; margin:2px 0;">${postalCity}</div>`;
        if (phone) html += `<div class="contact-info" style="font-size:10pt; margin:2px 0;">Tel.: ${phone}</div>`;
        if (email) html += `<div class="contact-info" style="font-size:10pt; margin:2px 0;">E-Mail: ${email}</div>`;
        if (website) html += `<div class="contact-info" style="font-size:10pt; margin:2px 0;">Web: ${website}</div>`;
        html += '</div>';
        html += '</div>';
        break;

      case 'template2':
        // Vorlage 2: Kontaktdaten links, Logo rechts
        html += '<div class="letterhead-top" style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:20px;">';
        html += '<div style="flex:1; margin-right:20px;">';
        if (doctorName) {
          html += `<div class="doctor-name" style="font-weight:bold; color:#2c3e50; margin-bottom:5px;">${doctorName}</div>`;
        }
        if (address) html += `<div class="address-line" style="font-size:10pt; margin:2px 0;">${address}</div>`;
        if (postalCity) html += `<div class="address-line" style="font-size:10pt; margin:2px 0;">${postalCity}</div>`;
        if (phone) html += `<div class="contact-info" style="font-size:10pt; margin:2px 0;">Tel.: ${phone}</div>`;
        if (email) html += `<div class="contact-info" style="font-size:10pt; margin:2px 0;">E-Mail: ${email}</div>`;
        if (website) html += `<div class="contact-info" style="font-size:10pt; margin:2px 0;">Web: ${website}</div>`;
        html += '</div>';
        html += '<div class="logo-container" style="flex:0 0 auto; text-align:right;">';
        if (logoUrlOrBase64) {
          html += `<img src="${logoUrlOrBase64}" alt="${location?.name || ''}" onerror="this.style.display='none';" style="max-height:100px; max-width:250px;" />`;
        } else if (location?.name) {
          html += `<h2 style="margin:0; font-size:18pt; color:#2c3e50; text-align:right;">${location.name}</h2>`;
        }
        html += `<div class="letterhead-date" style="font-size:10pt; color:#555; margin-top:10px;">${date}</div>`;
        html += '</div>';
        html += '</div>';
        break;

      case 'template3':
        // Vorlage 3: Drei-Spalten-Layout
        html += '<div class="letterhead-top" style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:20px;">';
        html += '<div style="flex:1; margin-right:15px;">';
        if (logoUrlOrBase64) {
          html += `<img src="${logoUrlOrBase64}" alt="${location?.name || ''}" onerror="this.style.display='none';" style="max-height:80px; max-width:200px;" />`;
        } else if (location?.name) {
          html += `<h3 style="margin:0; font-size:16pt; color:#2c3e50;">${location.name}</h3>`;
        }
        html += '</div>';
        html += '<div style="flex:1; text-align:center; margin:0 15px;">';
        if (doctorName) {
          html += `<div class="doctor-name" style="font-weight:bold; color:#2c3e50; margin-bottom:5px;">${doctorName}</div>`;
        }
        if (address) html += `<div class="address-line" style="font-size:10pt; margin:2px 0;">${address}</div>`;
        if (postalCity) html += `<div class="address-line" style="font-size:10pt; margin:2px 0;">${postalCity}</div>`;
        html += '</div>';
        html += '<div style="flex:1; text-align:right; margin-left:15px;">';
        html += `<div class="letterhead-date" style="font-size:10pt; color:#555; margin-bottom:10px;">${date}</div>`;
        if (phone) html += `<div class="contact-info" style="font-size:10pt; margin:2px 0;">Tel.: ${phone}</div>`;
        if (email) html += `<div class="contact-info" style="font-size:10pt; margin:2px 0;">E-Mail: ${email}</div>`;
        if (website) html += `<div class="contact-info" style="font-size:10pt; margin:2px 0;">Web: ${website}</div>`;
        html += '</div>';
        html += '</div>';
        break;

      default:
        // Custom/Standard: Wie template1
        html += '<div class="letterhead-top" style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:20px;">';
        html += '<div class="logo-container" style="flex:0 0 auto;">';
        if (logoUrlOrBase64) {
          html += `<img src="${logoUrlOrBase64}" alt="${location?.name || ''}" onerror="this.style.display='none';" style="max-height:100px; max-width:250px;" />`;
        } else if (location?.name) {
          html += `<h2 style="margin:0; font-size:18pt; color:#2c3e50;">${location.name}</h2>`;
        }
        html += '</div>';
        html += '<div style="text-align:right; flex:0 0 auto;">';
        html += `<div class="letterhead-date" style="font-size:10pt; color:#555; margin-bottom:10px;">${date}</div>`;
        if (doctorName) {
          html += `<div class="doctor-name" style="font-weight:bold; color:#2c3e50; margin-bottom:5px;">${doctorName}</div>`;
        }
        if (address) html += `<div class="address-line" style="font-size:10pt; margin:2px 0;">${address}</div>`;
        if (postalCity) html += `<div class="address-line" style="font-size:10pt; margin:2px 0;">${postalCity}</div>`;
        if (phone) html += `<div class="contact-info" style="font-size:10pt; margin:2px 0;">Tel.: ${phone}</div>`;
        if (email) html += `<div class="contact-info" style="font-size:10pt; margin:2px 0;">E-Mail: ${email}</div>`;
        if (website) html += `<div class="contact-info" style="font-size:10pt; margin:2px 0;">Web: ${website}</div>`;
        html += '</div>';
        html += '</div>';
    }

    html += '</div>'; // End letterhead
    return html;
  };

  // Dokument erstellen und direkt freigeben
  const handleCreateAndRelease = async () => {
    if (!patient || !user || !location) {
      setError('Patient, Benutzer oder Standort fehlt. Bitte überprüfen Sie die Eingaben.');
      return;
    }
    // Template ist optional - Dokument kann auch ohne Template erstellt werden

    // Bestätigung
    if (!window.confirm('Möchten Sie dieses Dokument erstellen und direkt freigeben?')) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Logo-URL mit vollständigem Pfad
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5001';
      let logoUrl: string | null = null;
      
      if (location?.logo?.filename) {
        logoUrl = `${apiUrl}/uploads/location-logos/${location.logo.filename}`;
      } else if (location?.logo?.path) {
        const cleanPath = location.logo.path.replace(/^\.\//, '').replace(/^\/+/, '');
        logoUrl = `${apiUrl}/${cleanPath}`;
      }
      
      const selectedTemplate = getSelectedTemplate();
      const letterhead = generateLetterhead(logoUrl, selectedTemplate);
      
      // Entferne ALLE vorhandenen Briefköpfe und Datumszeilen
      const contentWithoutLetterhead = removeLetterheadAndDates(documentContent);
      
      // Füge Briefkopf zum Content hinzu
      const contentWithLetterhead = letterhead + contentWithoutLetterhead;

      const documentData: Partial<Document> = {
        type: (template?.documentType || editingDocument?.type || 'sonstiges') as Document['type'],
        title: template?.name 
          ? `${template?.name} für ${patient.firstName} ${patient.lastName}`
          : (editingDocument?.title || `Dokument für ${patient.firstName} ${patient.lastName}`),
        content: {
          text: contentWithLetterhead.replace(/<[^>]*>/g, ''),
          html: contentWithLetterhead
        },
        patient: {
          id: patient._id || patient.id || '',
          name: `${patient.firstName} ${patient.lastName}`,
          dateOfBirth: patient.dateOfBirth || '',
          socialSecurityNumber: patient.socialSecurityNumber
        },
        doctor: {
          id: selectedDoctor?._id || user?._id || user?.id || '',
          name: selectedDoctor ? `${selectedDoctor.title || ''} ${selectedDoctor.firstName || ''} ${selectedDoctor.lastName || ''}`.trim() : (user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : ''),
          title: selectedDoctor?.title || undefined,
          specialization: selectedDoctor?.specialization || undefined
        },
        recipient: recipient || undefined,
        status: 'draft' as const, // Erst als Entwurf erstellen
        priority: documentPriority,
        templateId: template?._id || editingDocument?.templateId || undefined
      };

      // Erstelle das Dokument
      console.log('[StandaloneDocumentDialog] Erstelle Dokument mit handleCreateAndRelease...');
      const result: any = await dispatch(createDocument(documentData)).unwrap();
      console.log('[StandaloneDocumentDialog] Dokument erstellt, result:', JSON.stringify(result, null, 2));
      
      // Die Response-Struktur kann sein: { success: true, data: {...} } oder direkt das Dokument
      const document = result.data || result;
      const createdDocId = document._id || document.id;
      console.log('[StandaloneDocumentDialog] createdDocId:', createdDocId, 'document:', document);

      if (createdDocId) {
        console.log('[StandaloneDocumentDialog] Rufe Release-Route auf für Dokument:', createdDocId);
        // Rufe direkt die Release-Route auf
        const releaseResponse: any = await api.post(`/documents/${createdDocId}/release`, { comment: 'Direkt nach Erstellung freigegeben' });
        
        console.log('[StandaloneDocumentDialog] Release Response (vollständig):', JSON.stringify(releaseResponse, null, 2));
        
        // Die API-Antwort-Struktur ist: { data: { success: true, data: document, message: "..." }, success: true, message: "..." }
        // Oder möglicherweise: { data: { success: true, data: document } }
        let releasedDoc = null;
        
        if (releaseResponse?.data?.success && releaseResponse?.data?.data) {
          // Standard-Struktur: releaseResponse.data.data
          releasedDoc = releaseResponse.data.data;
        } else if (releaseResponse?.data && releaseResponse?.data?.status) {
          // Alternative: Das Dokument ist direkt in releaseResponse.data
          releasedDoc = releaseResponse.data;
        } else if (releaseResponse?.success && releaseResponse?.data) {
          // Alternative: releaseResponse.data direkt
          releasedDoc = releaseResponse.data;
        }
        
        if (!releasedDoc) {
          console.error('[StandaloneDocumentDialog] Freigabe fehlgeschlagen - Dokument nicht in Response gefunden:', releaseResponse);
          setError('Fehler beim Freigeben des Dokuments. Bitte versuchen Sie es erneut.');
          return;
        }
        
        console.log('[StandaloneDocumentDialog] Dokument nach Freigabe:', {
          id: releasedDoc._id || releasedDoc.id,
          status: releasedDoc.status,
          isReleased: releasedDoc.isReleased,
          currentVersion: releasedDoc.currentVersion
        });
        
        // Stelle sicher, dass der Status "released" ist
        const finalReleasedDoc = {
          ...releasedDoc,
          status: 'released' as const,
          isReleased: true
        };
        
        console.log('[StandaloneDocumentDialog] Setze editingDocument mit Status "released"');
        
        // Setze editingDocument, damit das Dokument sofort als freigegeben markiert ist
        // und nicht mehr bearbeitet werden kann
        setEditingDocument(finalReleasedDoc);
        setDocumentStatus('released');
        
        // Zeige Erfolgsmeldung
        setError(null);
        
        // Rufe onSaveSuccess auf, um die Dokumentenliste zu aktualisieren
        // WICHTIG: Dies muss NACH setEditingDocument passieren, damit der Status korrekt ist
        if (onSaveSuccess) {
          console.log('[StandaloneDocumentDialog] Rufe onSaveSuccess auf mit documentId:', createdDocId);
          onSaveSuccess(createdDocId);
        }
        
        // Dialog bleibt offen, damit der Benutzer das freigegebene Dokument sehen kann
        // Der Editor ist jetzt read-only, da editingDocument.status === 'released'
      } else {
        console.error('[StandaloneDocumentDialog] createdDocId ist leer oder undefined:', { result, createdDocId });
        setError('Fehler: Dokument wurde erstellt, aber die ID konnte nicht ermittelt werden.');
      }
    } catch (err: any) {
      console.error('[StandaloneDocumentDialog] Fehler in handleCreateAndRelease:', err);
      setError(err.message || err.response?.data?.message || 'Fehler beim Erstellen und Freigeben des Dokuments');
    } finally {
      setSaving(false);
    }
  };

  // Dokument freigeben (nur im Bearbeitungsmodus)
  const handleRelease = async () => {
    if (!patient || !user || !location) {
      setError('Patient, Benutzer oder Standort fehlt. Bitte überprüfen Sie die Eingaben.');
      return;
    }
    // Template ist optional - Dokument kann auch ohne Template freigegeben werden
    
    if (!isEditMode || !editingDocument) {
      setError('Nur vorhandene Dokumente können freigegeben werden.');
      return;
    }

    if (editingDocument.status === 'released') {
      setError('Das Dokument ist bereits freigegeben.');
      return;
    }

    // Bestätigung
    if (!window.confirm('Möchten Sie dieses Dokument wirklich freigeben? Nach der Freigabe kann es nicht mehr direkt bearbeitet werden.')) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Zuerst speichern wir die aktuellen Änderungen
      // Logo-URL mit vollständigem Pfad
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5001';
      let logoUrl: string | null = null;
      
      if (location?.logo?.filename) {
        logoUrl = `${apiUrl}/uploads/location-logos/${location.logo.filename}`;
      } else if (location?.logo?.path) {
        const cleanPath = location.logo.path.replace(/^\.\//, '').replace(/^\/+/, '');
        logoUrl = `${apiUrl}/${cleanPath}`;
      }
      
      const selectedTemplate = getSelectedTemplate();
      const letterhead = generateLetterhead(logoUrl, selectedTemplate);
      
      // Entferne ALLE vorhandenen Briefköpfe und Datumszeilen
      const contentWithoutLetterhead = removeLetterheadAndDates(documentContent);
      
      // Füge Briefkopf zum Content hinzu
      const contentWithLetterhead = letterhead + contentWithoutLetterhead;

      const documentData: Partial<Document> = {
        type: (template?.documentType || editingDocument?.type || 'sonstiges') as Document['type'],
        title: editingDocument.title || (template?.name 
          ? `${template?.name} für ${patient.firstName} ${patient.lastName}`
          : `Dokument für ${patient.firstName} ${patient.lastName}`),
        content: {
          text: contentWithLetterhead.replace(/<[^>]*>/g, ''),
          html: contentWithLetterhead
        },
        patient: {
          id: patient._id || patient.id || '',
          name: `${patient.firstName} ${patient.lastName}`,
          dateOfBirth: patient.dateOfBirth || '',
          socialSecurityNumber: patient.socialSecurityNumber
        },
        doctor: {
          id: selectedDoctor?._id || user?._id || user?.id || '',
          name: selectedDoctor ? `${selectedDoctor.title || ''} ${selectedDoctor.firstName || ''} ${selectedDoctor.lastName || ''}`.trim() : (user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : ''),
          title: selectedDoctor?.title || undefined,
          specialization: selectedDoctor?.specialization || undefined
        },
        recipient: recipient || undefined,
        status: documentStatus, // Behalte aktuellen Status beim Speichern
        priority: documentPriority,
        templateId: template?._id || editingDocument?.templateId || undefined
      };

      const docId = editingDocument._id || editingDocument.id || documentId;
      if (docId) {
        // Speichere zuerst die Änderungen
        await dispatch(updateDocument({ 
          id: docId, 
          documentData: documentData,
          expectedVersion: editingDocument.optimisticLockVersion
        })).unwrap();

        // Dann rufe die Release-Route auf
        const releaseResponse: any = await api.post(`/documents/${docId}/release`, { comment: '' });
        
        console.log('[StandaloneDocumentDialog] Release Response (vollständig):', JSON.stringify(releaseResponse, null, 2));
        
        // Die API-Antwort-Struktur ist: { data: { success: true, data: document, message: "..." }, success: true, message: "..." }
        let releasedDoc = null;
        
        if (releaseResponse?.data?.success && releaseResponse?.data?.data) {
          // Standard-Struktur: releaseResponse.data.data
          releasedDoc = releaseResponse.data.data;
        } else if (releaseResponse?.data && releaseResponse?.data?.status) {
          // Alternative: Das Dokument ist direkt in releaseResponse.data
          releasedDoc = releaseResponse.data;
        } else if (releaseResponse?.success && releaseResponse?.data) {
          // Alternative: releaseResponse.data direkt
          releasedDoc = releaseResponse.data;
        }
        
        if (!releasedDoc) {
          // Fallback: Dokument neu laden
          console.log('[StandaloneDocumentDialog] Dokument nicht in Response gefunden, lade neu...');
          const updatedDoc: any = await api.get(`/documents/${docId}`);
          releasedDoc = updatedDoc.data?.data || updatedDoc.data;
        }
        
        if (releasedDoc) {
          // Stelle sicher, dass der Status "released" ist
          const finalReleasedDoc = {
            ...releasedDoc,
            status: 'released' as const,
            isReleased: true
          };
          
          console.log('[StandaloneDocumentDialog] Setze editingDocument mit Status "released"');
          
          // Aktualisiere editingDocument sofort, damit der Editor read-only wird
          setEditingDocument(finalReleasedDoc);
          setDocumentStatus('released');
          
          console.log('[StandaloneDocumentDialog] Dokument nach Freigabe aktualisiert:', {
            id: docId,
            status: finalReleasedDoc.status,
            isReleased: finalReleasedDoc.isReleased
          });
        } else {
          console.error('[StandaloneDocumentDialog] Konnte Dokument nach Freigabe nicht laden');
          setError('Fehler beim Freigeben des Dokuments. Bitte versuchen Sie es erneut.');
        }

        if (onSaveSuccess) {
          const docId = editingDocument?._id || editingDocument?.id;
          onSaveSuccess(docId || undefined);
        }
      }
    } catch (err: any) {
      setError(err.message || err.response?.data?.message || 'Fehler beim Freigeben des Dokuments');
    } finally {
      setSaving(false);
    }
  };

  // Speichern
  const handleSave = async (finalize: boolean = false) => {
    if (!patient || !user || !location) {
      setError('Patient, Benutzer oder Standort fehlt. Bitte überprüfen Sie die Eingaben.');
      return;
    }
    // Template ist optional - Dokument kann auch ohne Template gespeichert werden

    // Verhindere Speichern von freigegebenen Dokumenten
    if (isEditMode && editingDocument && editingDocument.status === 'released') {
      setError('Freigegebene Dokumente können nicht direkt bearbeitet werden. Bitte erstellen Sie eine neue Version.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Logo-URL mit vollständigem Pfad (wie in PatientenbriefDialog)
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5001';
      let logoUrl: string | null = null;
      
      // Debug: Log logo data
      console.log('[StandaloneDocumentDialog] Logo data:', {
        hasLogo: !!location?.logo,
        filename: location?.logo?.filename,
        path: location?.logo?.path,
        fullLogo: location?.logo
      });
      
      if (location?.logo?.filename) {
        logoUrl = `${apiUrl}/uploads/location-logos/${location.logo.filename}`;
        console.log('[StandaloneDocumentDialog] Logo URL (from filename):', logoUrl);
      } else if (location?.logo?.path) {
        // Falls path direkt gesetzt ist
        // Der path ist bereits "uploads/location-logos/filename", also verwenden wir ihn direkt
        const cleanPath = location.logo.path.replace(/^\.\//, '').replace(/^\/+/, '');
        logoUrl = `${apiUrl}/${cleanPath}`;
        console.log('[StandaloneDocumentDialog] Logo URL (from path):', logoUrl);
      }
      
      const selectedTemplate = getSelectedTemplate();
      const letterhead = generateLetterhead(logoUrl, selectedTemplate);
      
      // Entferne ALLE vorhandenen Briefköpfe und Datumszeilen
      const contentWithoutLetterhead = removeLetterheadAndDates(documentContent);
      if (contentWithoutLetterhead !== documentContent) {
        console.log('[StandaloneDocumentDialog handleSave] Vorhandene Briefkopf(e) und Datumszeilen entfernt');
        console.log('[StandaloneDocumentDialog handleSave] Content-Länge vorher:', documentContent.length, 'nachher:', contentWithoutLetterhead.length);
      }
      
      // Prüfe, ob noch Briefköpfe vorhanden sind (Sicherheitscheck)
      const remainingLetterheads = (contentWithoutLetterhead.match(/class=["']letterhead["']/gi) || []).length;
      if (remainingLetterheads > 0) {
        console.warn(`[StandaloneDocumentDialog handleSave] WARNUNG: ${remainingLetterheads} Briefkopf(e) noch im Content vorhanden!`);
      }
      
      // Füge Briefkopf zum Content hinzu (nur einmal)
      const contentWithLetterhead = letterhead + contentWithoutLetterhead;
      
      // Debug: Prüfe, ob der Briefkopf korrekt hinzugefügt wurde
      const finalLetterheadCount = (contentWithLetterhead.match(/class=["']letterhead["']/gi) || []).length;
      if (finalLetterheadCount !== 1) {
        console.warn(`[StandaloneDocumentDialog handleSave] WARNUNG: ${finalLetterheadCount} Briefkopf(e) im finalen Content (erwartet: 1)`);
      } else {
        console.log('[StandaloneDocumentDialog handleSave] Briefkopf korrekt hinzugefügt (1 Briefkopf im finalen Content)');
      }

      const documentData: Partial<Document> = {
        type: (template?.documentType || editingDocument?.type || 'sonstiges') as Document['type'],
        title: isEditMode && editingDocument?.title 
          ? editingDocument.title 
          : (template?.name 
            ? `${template?.name} für ${patient.firstName} ${patient.lastName}`
            : `Dokument für ${patient.firstName} ${patient.lastName}`),
        content: {
          text: contentWithLetterhead.replace(/<[^>]*>/g, ''), // Plain text
          html: contentWithLetterhead
        },
        patient: {
          id: patient._id || patient.id || '',
          name: `${patient.firstName} ${patient.lastName}`,
          dateOfBirth: patient.dateOfBirth || '',
          socialSecurityNumber: patient.socialSecurityNumber
        },
        doctor: {
          id: selectedDoctor?._id || user?._id || user?.id || '',
          name: selectedDoctor ? `${selectedDoctor.title || ''} ${selectedDoctor.firstName || ''} ${selectedDoctor.lastName || ''}`.trim() : (user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : ''),
          title: selectedDoctor?.title || undefined,
          specialization: selectedDoctor?.specialization || undefined
        },
        recipient: recipient || undefined,
        status: isEditMode ? documentStatus : 'draft' as const, // Immer "draft" beim Erstellen, Release-Route setzt es auf "released"
        priority: isEditMode ? documentPriority : 'normal',
        templateId: template?._id || editingDocument?.templateId || undefined
      };

      if (isEditMode && editingDocument) {
        // Bearbeitungsmodus: Update
        const docId = editingDocument._id || editingDocument.id || documentId;
        if (docId) {
          await dispatch(updateDocument({ 
            id: docId, 
            documentData: documentData,
            expectedVersion: editingDocument.optimisticLockVersion
          })).unwrap();
        }
      } else {
        // Neues Dokument: Create
        const result: any = await dispatch(createDocument(documentData)).unwrap();
        const createdDoc = result.data || result;
        const createdDocId = createdDoc._id || createdDoc.id;
        
        if (onSaveSuccess) {
          onSaveSuccess(createdDocId || undefined);
        }
      }
      
      if (patient._id || patient.id) {
        dispatch(fetchDocuments({ patientId: patient._id || patient.id }));
      }

      if (onSaveSuccess && editingDocument) {
        const docId = editingDocument._id || editingDocument.id;
        onSaveSuccess(docId || undefined);
      }

      handleClose();
    } catch (err: any) {
      setError(err.message || 'Fehler beim Speichern des Dokuments');
    } finally {
      setSaving(false);
    }
  };

  // Hilfsfunktion: Konvertiere Logo-URL zu Base64 für Print-Preview
  const convertLogoToBase64 = async (logoUrl: string): Promise<string | null> => {
    try {
      const response = await fetch(logoUrl);
      if (!response.ok) {
        console.warn('[StandaloneDocumentDialog] Logo konnte nicht geladen werden:', logoUrl);
        return null;
      }
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result as string;
          resolve(base64String);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('[StandaloneDocumentDialog] Fehler beim Konvertieren des Logos zu Base64:', error);
      return null;
    }
  };

  // Drucken
  const handlePrint = async () => {
    if (!location) {
      alert('Standort nicht gefunden. Bitte wählen Sie einen Standort aus.');
      return;
    }
    // Template ist optional - Dokument kann auch ohne Template gedruckt werden
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Pop-up-Fenster blockiert. Bitte erlauben Sie Pop-ups für diese Website.');
      return;
    }

    // Logo-URL mit vollständigem Pfad (wie in PatientenbriefDialog)
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5001';
    let logoUrl: string | null = null;
    
    // Debug: Log logo data
    console.log('[StandaloneDocumentDialog handlePrint] Logo data:', {
      hasLogo: !!location?.logo,
      filename: location?.logo?.filename,
      path: location?.logo?.path,
      fullLogo: location?.logo
    });
    
    if (location?.logo?.filename) {
      logoUrl = `${apiUrl}/uploads/location-logos/${location.logo.filename}`;
      console.log('[StandaloneDocumentDialog handlePrint] Logo URL (from filename):', logoUrl);
    } else if (location?.logo?.path) {
      // Falls path direkt gesetzt ist
      // Der path ist bereits "uploads/location-logos/filename", also verwenden wir ihn direkt
      const cleanPath = location.logo.path.replace(/^\.\//, '').replace(/^\/+/, '');
      logoUrl = `${apiUrl}/${cleanPath}`;
      console.log('[StandaloneDocumentDialog handlePrint] Logo URL (from path):', logoUrl);
    }
    
    // Konvertiere Logo zu Base64 für Print-Preview
    let logoBase64: string | null = null;
    if (logoUrl) {
      logoBase64 = await convertLogoToBase64(logoUrl);
      console.log('[StandaloneDocumentDialog handlePrint] Logo Base64:', logoBase64 ? 'erfolgreich konvertiert' : 'konnte nicht konvertiert werden');
    }
    
    const selectedTemplate = getSelectedTemplate();
    // Verwende Base64-Logo wenn verfügbar, sonst URL
    const letterhead = generateLetterhead(logoBase64 || logoUrl, selectedTemplate);
    
    // Entferne ALLE vorhandenen Briefköpfe und Datumszeilen
    const contentWithoutLetterhead = removeLetterheadAndDates(documentContent);
    if (contentWithoutLetterhead !== documentContent) {
      console.log('[StandaloneDocumentDialog handlePrint] Vorhandene Briefkopf(e) und Datumszeilen entfernt');
      console.log('[StandaloneDocumentDialog handlePrint] Content-Länge vorher:', documentContent.length, 'nachher:', contentWithoutLetterhead.length);
    }
    
    // Prüfe, ob noch Briefköpfe vorhanden sind (Sicherheitscheck)
    const remainingLetterheads = (contentWithoutLetterhead.match(/class=["']letterhead["']/gi) || []).length;
    if (remainingLetterheads > 0) {
      console.warn(`[StandaloneDocumentDialog handlePrint] WARNUNG: ${remainingLetterheads} Briefkopf(e) noch im Content vorhanden!`);
    }
    
    // Füge Briefkopf zum Content hinzu (nur einmal)
    const contentWithLetterhead = letterhead + contentWithoutLetterhead;
    
    // Debug: Prüfe, ob der Briefkopf korrekt hinzugefügt wurde
    const finalLetterheadCount = (contentWithLetterhead.match(/class=["']letterhead["']/gi) || []).length;
    if (finalLetterheadCount !== 1) {
      console.warn(`[StandaloneDocumentDialog handlePrint] WARNUNG: ${finalLetterheadCount} Briefkopf(e) im finalen Content (erwartet: 1)`);
    } else {
      console.log('[StandaloneDocumentDialog handlePrint] Briefkopf korrekt hinzugefügt (1 Briefkopf im finalen Content)');
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${template?.name || editingDocument?.title || 'Dokument'}</title>
          <meta charset="UTF-8">
          <style>
            @media print {
              @page { margin: 1cm; }
              body { margin: 0; padding: 0; }
            }
            body { 
              font-family: Arial, sans-serif; 
              padding: 20px; 
              line-height: 1.6;
              color: #333;
            }
            .letterhead {
              margin-bottom: 30px;
              border-bottom: 2px solid #ddd;
              padding-bottom: 15px;
            }
            .letterhead img {
              max-height: 100px;
              max-width: 250px;
            }
          </style>
        </head>
        <body>
          ${contentWithLetterhead}
        </body>
      </html>
    `);
    printWindow.document.close();
    
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 250);
    };
    
    setTimeout(() => {
      if (printWindow.document.readyState === 'complete') {
        printWindow.print();
      }
    }, 500);
  };

  if (!template && loadingTemplate) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogContent>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
            <CircularProgress />
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  // Im Edit-Modus kann der Dialog auch ohne Template funktionieren
  // Im Erstellungsmodus ist ein Template erforderlich
  if (!template && !isEditMode) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogContent>
          <Alert severity="error">Vorlage nicht gefunden</Alert>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">{template?.name || editingDocument?.title || 'Dokument'}</Typography>
            <IconButton onClick={handleClose} size="small">
              <Close />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Box sx={{ mt: 1 }}>
            <Stack spacing={2}>
            {/* Empfänger-Auswahl */}
            {template?.requiresRecipient && (
              <Box>
                <FormControl fullWidth>
                  <InputLabel>Empfänger</InputLabel>
                  <Select
                    value={recipient?.type || ''}
                    onChange={(e) => {
                      const type = e.target.value as 'patient' | 'doctor' | 'organization' | 'contact';
                      setRecipient({
                        type,
                        name: '',
                        address: {}
                      });
                    }}
                  >
                    <MenuItem value="patient">Patient</MenuItem>
                    <MenuItem value="doctor">Arzt</MenuItem>
                    <MenuItem value="organization">Organisation</MenuItem>
                    <MenuItem value="contact">Kontakt</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            )}

            {recipient?.type === 'contact' && (
              <Box>
                <Autocomplete
                  options={availableContacts}
                  getOptionLabel={(option) => `${option.firstName || ''} ${option.lastName || ''} ${option.organization || ''}`.trim()}
                  loading={loadingContacts}
                  onChange={(_, value) => {
                    if (value) {
                      setRecipient({
                        type: 'contact',
                        contactId: value._id || value.id,
                        name: `${value.firstName || ''} ${value.lastName || ''}`.trim(),
                        organization: value.organization,
                        address: {
                          street: value.address?.street,
                          postalCode: value.address?.postalCode,
                          city: value.address?.city,
                          country: value.address?.country || 'Österreich'
                        },
                        phone: value.phone || value.mobile,
                        email: value.email
                      });
                    }
                  }}
                  renderInput={(params) => (
                    <TextField {...params} label="Kontakt auswählen" />
                  )}
                />
              </Box>
            )}

            {/* Arzt-Auswahl */}
            {availableDoctors.length > 1 && (
              <Box>
                <FormControl fullWidth>
                  <InputLabel>Arzt</InputLabel>
                  <Select
                    value={selectedDoctor?._id || ''}
                    onChange={(e) => {
                      const doctor = availableDoctors.find(d => d._id === e.target.value);
                      setSelectedDoctor(doctor || null);
                    }}
                  >
                    {availableDoctors.map((doctor) => (
                      <MenuItem key={doctor._id} value={doctor._id}>
                        {`${doctor.title || ''} ${doctor.firstName} ${doctor.lastName}`.trim()}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            )}

            {/* Status und Priorität (nur im Bearbeitungsmodus, NICHT für freigegebene Dokumente) */}
            {isEditMode && editingDocument && editingDocument.status !== 'released' && (
              <>
                <Box>
                  <FormControl fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={documentStatus}
                      onChange={(e) => setDocumentStatus(e.target.value as typeof documentStatus)}
                      label="Status"
                    >
                      <MenuItem value="draft">Entwurf</MenuItem>
                      <MenuItem value="ready">Bereit</MenuItem>
                      <MenuItem value="sent">Versendet</MenuItem>
                      <MenuItem value="received">Empfangen</MenuItem>
                      <MenuItem value="archived">Archiviert</MenuItem>
                      <MenuItem value="under_review">In Prüfung</MenuItem>
                      <MenuItem value="released">Freigegeben</MenuItem>
                      <MenuItem value="withdrawn">Zurückgezogen</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
                <Box>
                  <FormControl fullWidth>
                    <InputLabel>Priorität</InputLabel>
                    <Select
                      value={documentPriority}
                      onChange={(e) => setDocumentPriority(e.target.value as typeof documentPriority)}
                      label="Priorität"
                    >
                      <MenuItem value="niedrig">Niedrig</MenuItem>
                      <MenuItem value="normal">Normal</MenuItem>
                      <MenuItem value="hoch">Hoch</MenuItem>
                      <MenuItem value="dringend">Dringend</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </>
            )}

            {/* Tabs */}
            <Box>
              <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
                <Tab label="Editor" />
                <Tab label="Vorschau" />
                {/* Versionshistorie Tab - immer anzeigen wenn im Edit-Modus */}
                {isEditMode && (
                  <Tab label="Versionshistorie" />
                )}
              </Tabs>
            </Box>

            {/* Editor Tab */}
            {activeTab === 0 && (
              <Box>
                {editingDocument && editingDocument.status === 'released' ? (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Dieses Dokument ist freigegeben und kann nicht direkt bearbeitet werden. 
                    Bitte erstellen Sie eine neue Version, um Änderungen vorzunehmen.
                  </Alert>
                ) : null}
                <RichTextEditor
                  value={documentContent}
                  onChange={setDocumentContent}
                  placeholder={editingDocument && editingDocument.status === 'released' 
                    ? "Dokument ist freigegeben. Bitte erstellen Sie eine neue Version zum Bearbeiten." 
                    : "Dokumentinhalt bearbeiten..."}
                  minHeight={400}
                  readOnly={editingDocument?.status === 'released'}
                />
              </Box>
            )}

            {/* Vorschau Tab */}
            {activeTab === 1 && (
              <Box>
                <Paper sx={{ p: 2, minHeight: 400, border: '1px solid #ddd' }}>
                  <div dangerouslySetInnerHTML={{ __html: processedContent }} />
                </Paper>
              </Box>
            )}

            {/* Versionshistorie Tab (nur im Bearbeitungsmodus) */}
            {activeTab === 2 && isEditMode && (
              <Box>
                {(() => {
                  const docId = editingDocument?._id || editingDocument?.id || documentId || '';
                  console.log('[StandaloneDocumentDialog] Rendering Versionshistorie für documentId:', docId);
                  if (!docId) {
                    return (
                      <Alert severity="info">
                        Dokument-ID nicht gefunden. Versionshistorie kann nicht geladen werden.
                      </Alert>
                    );
                  }
                  return (
                    <DocumentVersionHistory
                      documentId={docId}
                      onViewVersion={async (version) => {
                        try {
                          const docId = editingDocument?._id || editingDocument?.id || documentId || '';
                          console.log('[StandaloneDocumentDialog] Loading version:', {
                            documentId: docId,
                            versionNumber: version.versionNumber,
                            version: version
                          });
                          
                          if (!docId) {
                            console.error('[StandaloneDocumentDialog] Keine Dokument-ID gefunden');
                            setError('Dokument-ID nicht gefunden');
                            return;
                          }
                          
                          // Lade Version direkt über API (verwende api wie in DocumentVersionHistory)
                          const response: any = await api.get(`/documents/${docId}/versions/${version.versionNumber}`);
                          console.log('[StandaloneDocumentDialog] API Response:', response);
                          
                          const versionData = response.data?.data || response.data;
                          
                          console.log('[StandaloneDocumentDialog] Version loaded:', {
                            versionNumber: versionData?.versionNumber,
                            hasSnapshot: !!versionData?.documentSnapshot,
                            hasContent: !!versionData?.documentSnapshot?.content,
                            versionData: versionData
                          });
                          
                          if (versionData) {
                            setViewingVersion(versionData);
                            setViewVersionDialogOpen(true);
                            console.log('[StandaloneDocumentDialog] Dialog sollte jetzt geöffnet sein');
                          } else {
                            console.error('[StandaloneDocumentDialog] Keine Versionsdaten erhalten');
                            setError('Version konnte nicht geladen werden');
                          }
                        } catch (error: any) {
                          console.error('[StandaloneDocumentDialog] Fehler beim Laden der Version:', error);
                          console.error('[StandaloneDocumentDialog] Error details:', {
                            message: error.message,
                            response: error.response,
                            stack: error.stack
                          });
                          setError(error.response?.data?.message || error.message || 'Fehler beim Laden der Version');
                        }
                      }}
                      onCompareVersions={(version1, version2) => {
                        setComparingVersions([version1, version2]);
                        setCompareVersionsDialogOpen(true);
                      }}
                    />
                  );
                })()}
              </Box>
            )}
          </Stack>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Abbrechen</Button>
          <Button onClick={handlePrint} startIcon={<Print />}>
            Drucken
          </Button>
          {/* Button zum Erstellen einer neuen Version (nur bei freigegebenen Dokumenten) */}
          {(() => {
            const showNewVersionButton = isEditMode && editingDocument && editingDocument.status === 'released';
            console.log('[StandaloneDocumentDialog] Button "Neue Version erstellen" anzeigen?', {
              showNewVersionButton,
              isEditMode,
              hasEditingDocument: !!editingDocument,
              documentStatus: editingDocument?.status
            });
            return showNewVersionButton;
          })() && (
            <Button
              onClick={async () => {
                if (!editingDocument || (!editingDocument._id && !editingDocument.id)) return;
                try {
                  setSaving(true);
                  setError(null);
                  const docId = editingDocument._id || editingDocument.id || documentId;
                  if (docId) {
                    // Entferne ALLE Briefköpfe und Datumszeilen aus documentContent
                    const contentWithoutLetterhead = removeLetterheadAndDates(documentContent);
                    
                    // Erstelle neue Version mit aktuellem Inhalt und Status auf "draft"
                    await dispatch(createNewVersion({
                      documentId: docId,
                      updates: {
                        content: {
                          text: contentWithoutLetterhead.replace(/<[^>]*>/g, ''),
                          html: contentWithoutLetterhead
                        },
                        status: 'draft' // Status auf Entwurf setzen
                      },
                      changeReason: 'Neue Version nach Freigabe erstellt'
                    })).unwrap();
                    
                    // Lade Dokument neu
                    const response: any = await apiRequest.get(`/documents/${docId}`);
                    const doc = response.data?.data || response.data;
                    setEditingDocument(doc);
                    if (doc.content?.html) {
                      // Entferne ALLE Briefköpfe und Datumszeilen aus dem geladenen Content
                      const contentWithoutLetterhead = removeLetterheadAndDates(doc.content.html);
                      setDocumentContent(contentWithoutLetterhead);
                    }
                    if (doc.status) {
                      setDocumentStatus(doc.status);
                    }
                    
                    alert('Neue Version wurde erfolgreich erstellt. Das Dokument ist jetzt wieder im Entwurfsstatus.');
                  }
                } catch (err: any) {
                  setError(err.message || 'Fehler beim Erstellen der neuen Version');
                } finally {
                  setSaving(false);
                }
              }}
              variant="outlined"
              color="primary"
              disabled={saving}
              startIcon={<Add />}
            >
              Neue Version erstellen
            </Button>
          )}
          {/* Buttons ausblenden, wenn Dokument freigegeben ist */}
          {editingDocument && editingDocument.status === 'released' ? (
            <Alert severity="success" sx={{ width: '100%' }}>
              Dokument wurde erfolgreich freigegeben und kann nicht mehr bearbeitet werden.
            </Alert>
          ) : (
            <>
              <Button onClick={() => handleSave(false)} variant="outlined" startIcon={<Save />} disabled={saving}>
                Entwurf speichern
              </Button>
              <Button onClick={() => handleSave(true)} variant="contained" startIcon={<Save />} disabled={saving}>
                {saving ? <CircularProgress size={20} /> : 'Speichern'}
              </Button>
              {/* Freigeben-Button: Im Erstellungsmodus oder wenn Status "draft" oder "under_review" oder kein Status (neue Dokumente ohne Template) */}
              {(!isEditMode || !editingDocument || editingDocument.status === 'draft' || editingDocument.status === 'under_review' || !editingDocument.status) && (
                <Button 
                  onClick={!isEditMode ? handleCreateAndRelease : handleRelease} 
                  variant="contained" 
                  color="success"
                  startIcon={<CheckCircle />} 
                  disabled={saving}
                >
                  {saving ? <CircularProgress size={20} /> : (!isEditMode ? 'Erstellen & Freigeben' : 'Freigeben')}
                </Button>
              )}
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Datenquelle-Auswahl */}
      {patient?._id && (
        <DataSourceSelector
          open={dataSourceSelectorOpen}
          onClose={() => setDataSourceSelectorOpen(false)}
          patientId={patient._id || patient.id || ''}
          documentType={template?.documentType || 'sonstiges'}
          onSelect={(source: 'dekurs' | 'document' | 'manual', data?: Document | DekursEntry) => {
            setSelectedDataSource(source);
            if (source === 'document' && data) {
              setSelectedDocument(data as Document);
            } else if (source === 'dekurs' && data) {
              setLatestDekursEntry(data as DekursEntry);
            }
            setDataSourceSelectorOpen(false);
          }}
        />
      )}

      {/* Dialog: Version anzeigen */}
      <Dialog 
        open={viewVersionDialogOpen} 
        onClose={() => {
          console.log('[StandaloneDocumentDialog] Closing version dialog');
          setViewVersionDialogOpen(false);
          setViewingVersion(null);
        }} 
        maxWidth="lg" 
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="h6">
              Version {viewingVersion?.versionNumber || 'Laden...'}
            </Typography>
            {viewingVersion?.versionStatus && (
              <Chip
                label={viewingVersion.versionStatus === 'released' ? 'Freigegeben' : 
                       viewingVersion.versionStatus === 'draft' ? 'Entwurf' : 
                       viewingVersion.versionStatus === 'under_review' ? 'In Prüfung' : 
                       viewingVersion.versionStatus}
                color={viewingVersion.versionStatus === 'released' ? 'success' : 
                       viewingVersion.versionStatus === 'draft' ? 'default' : 
                       viewingVersion.versionStatus === 'under_review' ? 'warning' : 'default'}
                size="small"
              />
            )}
          </Stack>
        </DialogTitle>
        <DialogContent>
          {!viewingVersion ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box>
              <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                {viewingVersion.createdAt && (
                  <Typography variant="body2" color="text.secondary">
                    Erstellt: {new Date(viewingVersion.createdAt).toLocaleString('de-DE')}
                  </Typography>
                )}
                {viewingVersion.createdBy && (
                  <Typography variant="body2" color="text.secondary">
                    Von: {viewingVersion.createdBy.firstName || ''} {viewingVersion.createdBy.lastName || ''}
                  </Typography>
                )}
                {viewingVersion.releasedAt && (
                  <Typography variant="body2" color="success.main">
                    Freigegeben: {new Date(viewingVersion.releasedAt).toLocaleString('de-DE')}
                  </Typography>
                )}
              </Stack>
              
              {viewingVersion.changeReason && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    <strong>Grund:</strong> {viewingVersion.changeReason}
                  </Typography>
                </Alert>
              )}
              
              {viewingVersion.documentSnapshot?.content?.html ? (
                <Box 
                  sx={{ 
                    mt: 2, 
                    p: 3, 
                    border: 1, 
                    borderColor: 'divider', 
                    borderRadius: 1,
                    bgcolor: 'background.paper',
                    maxHeight: '70vh',
                    overflow: 'auto',
                    '& p': {
                      marginBottom: '0.5em'
                    },
                    '& strong': {
                      fontWeight: 'bold'
                    }
                  }}
                  dangerouslySetInnerHTML={{ 
                    __html: viewingVersion.documentSnapshot.content.html 
                  }}
                />
              ) : (
                <Alert severity="warning">
                  Kein Inhalt für diese Version verfügbar.
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            console.log('[StandaloneDocumentDialog] Closing version dialog via button');
            setViewVersionDialogOpen(false);
            setViewingVersion(null);
          }}>
            Schließen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Versionen vergleichen */}
      <Dialog 
        open={compareVersionsDialogOpen} 
        onClose={() => {
          setCompareVersionsDialogOpen(false);
          setComparingVersions([null, null]);
        }} 
        maxWidth="lg" 
        fullWidth
      >
        <DialogTitle>
          Versionen vergleichen: {comparingVersions[0]} ↔ {comparingVersions[1]}
        </DialogTitle>
        <DialogContent>
          {comparingVersions[0] && comparingVersions[1] && (
            <DocumentVersionComparison
              documentId={editingDocument?._id || editingDocument?.id || documentId || ''}
              version1={comparingVersions[0]}
              version2={comparingVersions[1]}
              onClose={() => {
                setCompareVersionsDialogOpen(false);
                setComparingVersions([null, null]);
              }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setCompareVersionsDialogOpen(false);
            setComparingVersions([null, null]);
          }}>
            Schließen
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default StandaloneDocumentDialog;

