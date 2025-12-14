# Konzept: Patientenbrief-Editor mit Dekurs-Integration

## 1. Übersicht

Der Patientenbrief soll eine vollständige Briefvorlage mit Briefkopf, Arztauswahl, Standortdaten und integriertem Dekurs-Inhalt sein. Der Benutzer kann die übernommenen Dekurs-Daten direkt im Editor bearbeiten und das Dokument als Entwurf oder finalisiert speichern.

## 2. Datenstrukturen

### 2.1 Standort (Location)
- **Logo**: `location.logo` (filename, path, width, height)
- **Adresse**: `address_line1`, `address_line2`, `postal_code`, `city`
- **Kontakt**: `phone`, `email`
- **Owner**: `location.owner` (title, firstName, lastName, phone, email, website)

### 2.2 Ärzte für Standort
- **API-Endpunkt**: `GET /api/staff-location-assignments/location/:location_id`
- **Response**: Array von `StaffLocationAssignment` mit `staff_id` (populated mit User-Daten)
- **User-Daten**: `firstName`, `lastName`, `title`, `email`, `phone`, `specialization`

### 2.3 Aktueller Dekurs-Eintrag
- **Quelle**: Neuester Eintrag aus `dekursEntries` (Redux Store)
- **Felder**:
  - `clinicalObservations` (Klinische Beobachtungen)
  - `progressChecks` (Verlaufskontrolle)
  - `findings` (Befunde)
  - `medicationChanges` (Medikamentenänderungen)
  - `treatmentDetails` (Behandlungsdetails)
  - `psychosocialFactors` (Psychosoziale Faktoren)
  - `notes` (Notizen)
  - `visitReason` (Besuchsgrund)
  - `visitType` (Besuchsart)
  - `imagingFindings` (Bildgebende Befunde)
  - `laboratoryFindings` (Laborbefunde)
  - `linkedDiagnoses` (Verknüpfte Diagnosen)
  - `linkedMedications` (Verknüpfte Medikamente)

### 2.4 Dokument
- **Typ**: `'sonstiges'` (da `patientenbrief` nicht im Backend enum ist)
- **Status**: `'draft'` oder `'ready'` (finalisiert)
- **Content**: HTML-Format mit Briefkopf und bearbeitbarem Inhalt

## 3. UI-Komponente: Patientenbrief-Editor

### 3.1 Dialog-Struktur

```
<Dialog fullScreen={true} maxWidth="lg" fullWidth>
  <DialogTitle>
    Patientenbrief erstellen
    <IconButton onClick={handleClose}>×</IconButton>
  </DialogTitle>
  
  <DialogContent>
    {/* Briefkopf-Sektion */}
    <BriefkopfSection />
    
    {/* Arztauswahl (wenn mehrere Ärzte) */}
    <ArztAuswahlSection />
    
    {/* Standortdaten */}
    <StandortDatenSection />
    
    {/* Dekurs-Übernahme */}
    <DekursUebernahmeSection />
    
    {/* Editor für Briefinhalt */}
    <BriefInhaltEditor />
  </DialogContent>
  
  <DialogActions>
    <Button onClick={handlePrint} startIcon={<Print />}>Drucken</Button>
    <Box sx={{ flex: 1 }} /> {/* Spacer */}
    <Button onClick={handleSaveDraft}>Als Entwurf speichern</Button>
    <Button onClick={handleSaveFinalized} variant="contained">Finalisieren</Button>
  </DialogActions>
</Dialog>
```

### 3.2 Briefkopf-Sektion

**Komponente**: `BriefkopfSection`

**Funktionalität**:
- Zeigt Logo aus `currentLocation.logo` (falls vorhanden)
- Logo wird über API geladen: `/api/uploads/${location.logo.filename}`
- Falls kein Logo: Zeigt Standortname als Text

**Layout**:
```
<Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
  <Box>
    {location.logo ? (
      <img 
        src={`/api/uploads/${location.logo.filename}`} 
        alt={location.name}
        style={{ maxHeight: '80px', maxWidth: '200px' }}
      />
    ) : (
      <Typography variant="h6">{location.name}</Typography>
    )}
  </Box>
  <Box sx={{ textAlign: 'right' }}>
    <Typography variant="body2">{new Date().toLocaleDateString('de-DE')}</Typography>
  </Box>
</Box>
```

### 3.3 Arztauswahl-Sektion

**Komponente**: `ArztAuswahlSection`

**Funktionalität**:
- Lädt Ärzte für aktuellen Standort: `GET /api/staff-location-assignments/location/:locationId`
- Filtert nur Ärzte (role === 'doctor' oder ähnlich)
- Falls nur 1 Arzt: Zeigt Arztdaten direkt an
- Falls mehrere Ärzte: Dropdown zur Auswahl

**State**:
```typescript
const [selectedDoctor, setSelectedDoctor] = useState<User | null>(null);
const [availableDoctors, setAvailableDoctors] = useState<User[]>([]);
```

**Layout**:
```
{availableDoctors.length > 1 ? (
  <FormControl fullWidth sx={{ mb: 2 }}>
    <InputLabel>Arzt auswählen</InputLabel>
    <Select
      value={selectedDoctor?._id || ''}
      onChange={(e) => {
        const doctor = availableDoctors.find(d => d._id === e.target.value);
        setSelectedDoctor(doctor || null);
      }}
    >
      {availableDoctors.map(doctor => (
        <MenuItem key={doctor._id} value={doctor._id}>
          {doctor.title} {doctor.firstName} {doctor.lastName}
        </MenuItem>
      ))}
    </Select>
  </FormControl>
) : availableDoctors.length === 1 ? (
  <Typography variant="body1" sx={{ mb: 2 }}>
    {availableDoctors[0].title} {availableDoctors[0].firstName} {availableDoctors[0].lastName}
  </Typography>
) : null}
```

### 3.4 Standortdaten-Sektion

**Komponente**: `StandortDatenSection`

**Funktionalität**:
- Zeigt Adresse, Telefon, Email, Webseite des ausgewählten Arztes oder Standortes
- Priorität: Arztdaten > Standort-Owner-Daten > Standort-Daten

**Layout**:
```
<Box sx={{ mb: 3 }}>
  <Typography variant="body2" fontWeight="bold" gutterBottom>
    {location.name}
  </Typography>
  <Typography variant="body2">
    {location.address_line1}
    {location.address_line2 && `, ${location.address_line2}`}
  </Typography>
  <Typography variant="body2">
    {location.postal_code} {location.city}
  </Typography>
  {(selectedDoctor?.phone || location.owner?.phone || location.phone) && (
    <Typography variant="body2">
      Tel: {selectedDoctor?.phone || location.owner?.phone || location.phone}
    </Typography>
  )}
  {(selectedDoctor?.email || location.owner?.email || location.email) && (
    <Typography variant="body2">
      Email: {selectedDoctor?.email || location.owner?.email || location.email}
    </Typography>
  )}
  {(selectedDoctor?.website || location.owner?.website) && (
    <Typography variant="body2">
      Web: {selectedDoctor?.website || location.owner?.website}
    </Typography>
  )}
</Box>
```

### 3.5 Dekurs-Übernahme-Sektion

**Komponente**: `DekursUebernahmeSection`

**Funktionalität**:
- Lädt neuesten Dekurs-Eintrag für Patienten
- Zeigt Checkboxen für zu übernehmende Felder
- Beim Aktivieren werden Daten in Editor übernommen
- Daten können im Editor bearbeitet werden
- **Erweitert**: Übernahme von Diagnosen und Medikamenten aus Dekurs

**State**:
```typescript
const [selectedDekursFields, setSelectedDekursFields] = useState<string[]>([]);
const [latestDekursEntry, setLatestDekursEntry] = useState<DekursEntry | null>(null);
const [includeDiagnoses, setIncludeDiagnoses] = useState<boolean>(false);
const [includeMedications, setIncludeMedications] = useState<boolean>(false);
```

**Layout**:
```
<Paper sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
  <Typography variant="subtitle2" gutterBottom>
    Daten aus aktuellem Dekurs übernehmen
  </Typography>
  {latestDekursEntry ? (
    <FormGroup>
      {/* Textfelder aus Dekurs */}
      {dekursFields.map(field => (
        <FormControlLabel
          key={field.key}
          control={
            <Checkbox
              checked={selectedDekursFields.includes(field.key)}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedDekursFields([...selectedDekursFields, field.key]);
                  // Füge Daten zum Editor hinzu
                  addDekursDataToEditor(field.key, latestDekursEntry[field.key]);
                } else {
                  setSelectedDekursFields(selectedDekursFields.filter(k => k !== field.key));
                  // Entferne Daten aus Editor
                  removeDekursDataFromEditor(field.key);
                }
              }}
            />
          }
          label={field.label}
        />
      ))}
      
      {/* Diagnosen aus Dekurs übernehmen */}
      {latestDekursEntry.linkedDiagnoses && latestDekursEntry.linkedDiagnoses.length > 0 && (
        <FormControlLabel
          control={
            <Checkbox
              checked={includeDiagnoses}
              onChange={(e) => {
                setIncludeDiagnoses(e.target.checked);
                if (e.target.checked) {
                  // Kopiere Diagnosen aus Dekurs
                  setLinkedDiagnoses([...latestDekursEntry.linkedDiagnoses]);
                } else {
                  // Entferne alle Diagnosen, die aus Dekurs stammen
                  setLinkedDiagnoses([]);
                }
              }}
            />
          }
          label={`Diagnosen übernehmen (${latestDekursEntry.linkedDiagnoses.length})`}
        />
      )}
      
      {/* Medikamente aus Dekurs übernehmen */}
      {latestDekursEntry.linkedMedications && latestDekursEntry.linkedMedications.length > 0 && (
        <FormControlLabel
          control={
            <Checkbox
              checked={includeMedications}
              onChange={(e) => {
                setIncludeMedications(e.target.checked);
                if (e.target.checked) {
                  // Kopiere Medikamente aus Dekurs
                  setLinkedMedications([...latestDekursEntry.linkedMedications]);
                } else {
                  // Entferne alle Medikamente, die aus Dekurs stammen
                  setLinkedMedications([]);
                }
              }}
            />
          }
          label={`Medikamente übernehmen (${latestDekursEntry.linkedMedications.length})`}
        />
      )}
    </FormGroup>
  ) : (
    <Typography variant="body2" color="text.secondary">
      Kein Dekurs-Eintrag gefunden
    </Typography>
  )}
</Paper>
```

**Dekurs-Felder-Mapping**:
```typescript
const dekursFields = [
  { key: 'visitReason', label: 'Besuchsgrund' },
  { key: 'clinicalObservations', label: 'Klinische Beobachtungen' },
  { key: 'findings', label: 'Befunde' },
  { key: 'progressChecks', label: 'Verlaufskontrolle' },
  { key: 'treatmentDetails', label: 'Behandlungsdetails' },
  { key: 'medicationChanges', label: 'Medikamentenänderungen' },
  { key: 'imagingFindings', label: 'Bildgebende Befunde' },
  { key: 'laboratoryFindings', label: 'Laborbefunde' },
  { key: 'psychosocialFactors', label: 'Psychosoziale Faktoren' },
  { key: 'notes', label: 'Notizen' }
];
```

### 3.6 Diagnosen-Erfassung

**Komponente**: `DiagnosenSection`

**Funktionalität**:
- Verwendet die gleiche Logik wie im Dekurs
- `ICD10Autocomplete` Komponente für Diagnosen-Suche
- Anzeige und Bearbeitung von verknüpften Diagnosen
- Übernahme von Diagnosen aus aktuellem Dekurs (falls vorhanden)

**State**:
```typescript
const [linkedDiagnoses, setLinkedDiagnoses] = useState<LinkedDiagnosis[]>([]);
```

**LinkedDiagnosis Interface** (aus `dekursSlice.ts`):
```typescript
interface LinkedDiagnosis {
  diagnosisId?: string;
  icd10Code?: string;
  display?: string;
  side?: 'left' | 'right' | 'bilateral' | '';
  isPrimary?: boolean;
  notes?: string;
  status?: 'active' | 'resolved' | 'provisional' | 'ruled-out';
  severity?: 'mild' | 'moderate' | 'severe' | 'critical';
  onsetDate?: string;
  resolvedDate?: string;
  catalogYear?: number;
  source?: string;
}
```

**Layout**:
```
<Box sx={{ mt: 3 }}>
  <Typography variant="h6" gutterBottom>
    Diagnosen
  </Typography>
  
  {/* ICD10 Autocomplete */}
  <ICD10Autocomplete
    onSelect={(code: string, display: string, fullCode: any) => {
      handleAddDiagnosis(fullCode);
    }}
  />
  
  {/* Liste der verknüpften Diagnosen */}
  {linkedDiagnoses.length > 0 && (
    <Stack spacing={1} sx={{ mt: 2 }}>
      {linkedDiagnoses.map((diag, index) => (
        <Paper key={index} sx={{ p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
              <Typography variant="body2" fontWeight="bold">
                {diag.icd10Code} - {diag.display}
              </Typography>
              {diag.isPrimary && (
                <Chip label="Hauptdiagnose" size="small" color="primary" />
              )}
              {diag.status && (
                <Chip 
                  label={getStatusLabel(diag.status)} 
                  size="small" 
                  color={getStatusColor(diag.status)} 
                  variant="outlined" 
                />
              )}
              {diag.severity && (
                <Chip 
                  label={getSeverityLabel(diag.severity)} 
                  size="small" 
                  color={getSeverityColor(diag.severity)} 
                  variant="outlined" 
                />
              )}
              {diag.side && (
                <Chip 
                  label={diag.side === 'left' ? 'Links' : diag.side === 'right' ? 'Rechts' : 'Beidseitig'} 
                  size="small" 
                  color="secondary" 
                  variant="outlined" 
                />
              )}
            </Box>
            {diag.notes && (
              <Typography variant="caption" color="text.secondary">
                Notizen: {diag.notes}
              </Typography>
            )}
          </Box>
          <Stack direction="row" spacing={0.5}>
            <IconButton size="small" onClick={() => handleEditDiagnosis(index)} color="primary">
              <Edit />
            </IconButton>
            <IconButton size="small" onClick={() => handleRemoveDiagnosis(index)} color="error">
              <Delete />
            </IconButton>
          </Stack>
        </Paper>
      ))}
    </Stack>
  )}
</Box>
```

**Handler-Funktionen**:
```typescript
const handleAddDiagnosis = (fullCode: any) => {
  const newDiagnosis: LinkedDiagnosis = {
    icd10Code: fullCode.code,
    display: fullCode.display,
    status: 'active',
    isPrimary: linkedDiagnoses.length === 0, // Erste Diagnose ist automatisch Hauptdiagnose
    catalogYear: new Date().getFullYear(),
    source: 'clinical'
  };
  setLinkedDiagnoses([...linkedDiagnoses, newDiagnosis]);
};

const handleEditDiagnosis = (index: number) => {
  // Öffne Dialog zur Bearbeitung der Diagnose
  // (gleiche Logik wie im DekursDialog)
};

const handleRemoveDiagnosis = (index: number) => {
  setLinkedDiagnoses(linkedDiagnoses.filter((_, i) => i !== index));
};
```

### 3.7 Medikamenten-Erfassung

**Komponente**: `MedikamentenSection`

**Funktionalität**:
- Verwendet die gleiche Logik wie im Dekurs
- `MedicationAutocomplete` Komponente für Medikamenten-Suche
- Anzeige und Bearbeitung von verknüpften Medikamenten
- Übernahme von Medikamenten aus aktuellem Dekurs (falls vorhanden)

**State**:
```typescript
const [linkedMedications, setLinkedMedications] = useState<LinkedMedication[]>([]);
```

**LinkedMedication Interface** (aus `dekursSlice.ts`):
```typescript
interface LinkedMedication {
  medicationId?: string;
  name: string;
  dosage?: string;
  dosageUnit?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
  startDate?: string | Date;
  endDate?: string | Date;
  quantity?: number;
  quantityUnit?: string;
  route?: 'oral' | 'topical' | 'injection' | 'inhalation' | 'rectal' | 'vaginal' | 'other';
  changeType?: 'added' | 'modified' | 'discontinued' | 'unchanged';
  notes?: string;
}
```

**Layout**:
```
<Box sx={{ mt: 3 }}>
  <Typography variant="h6" gutterBottom>
    Medikamente
  </Typography>
  
  {/* Medication Autocomplete */}
  <MedicationAutocomplete
    value={null}
    onChange={(medication) => {
      if (medication) {
        handleAddMedication(medication);
      }
    }}
  />
  
  {/* Liste der verknüpften Medikamente */}
  {linkedMedications.length > 0 && (
    <Stack spacing={1} sx={{ mt: 2 }}>
      {linkedMedications.map((med, index) => (
        <Paper key={index} sx={{ p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" fontWeight="bold">{med.name}</Typography>
            <Box sx={{ mt: 0.5 }}>
              <Typography variant="caption" color="text.secondary" display="block">
                {med.dosage && med.dosageUnit ? `${med.dosage} ${med.dosageUnit}` : med.dosage ? med.dosage : ''}
                {med.frequency && ` • ${med.frequency}`}
                {med.duration && ` • Dauer: ${med.duration}`}
                {med.route && med.route !== 'oral' && ` • ${getRouteLabel(med.route)}`}
              </Typography>
              {med.quantity && med.quantityUnit && (
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                  Menge: {med.quantity} {med.quantityUnit}
                </Typography>
              )}
              {med.startDate && (
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                  Startdatum: {typeof med.startDate === 'string' ? new Date(med.startDate).toLocaleDateString('de-DE') : new Date(med.startDate).toLocaleDateString('de-DE')}
                </Typography>
              )}
              {med.endDate && (
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                  Enddatum: {typeof med.endDate === 'string' ? new Date(med.endDate).toLocaleDateString('de-DE') : new Date(med.endDate).toLocaleDateString('de-DE')}
                </Typography>
              )}
              {med.instructions && (
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                  Einnahmehinweise: {med.instructions}
                </Typography>
              )}
              {med.notes && (
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                  Notizen: {med.notes}
                </Typography>
              )}
              {med.changeType && med.changeType !== 'added' && (
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                  Status: {getChangeTypeLabel(med.changeType)}
                </Typography>
              )}
            </Box>
          </Box>
          <Stack direction="row" spacing={0.5}>
            <IconButton size="small" onClick={() => handleEditMedication(index)} color="primary">
              <Edit />
            </IconButton>
            <IconButton size="small" onClick={() => handleRemoveMedication(index)} color="error">
              <Delete />
            </IconButton>
          </Stack>
        </Paper>
      ))}
    </Stack>
  )}
</Box>
```

**Handler-Funktionen**:
```typescript
const handleAddMedication = (medication: any) => {
  const newMedication: LinkedMedication = {
    medicationId: medication._id || medication.id,
    name: medication.name,
    changeType: 'added',
    route: 'oral'
  };
  setLinkedMedications([...linkedMedications, newMedication]);
};

const handleEditMedication = (index: number) => {
  // Öffne Dialog zur Bearbeitung des Medikaments
  // (gleiche Logik wie im DekursDialog)
};

const handleRemoveMedication = (index: number) => {
  setLinkedMedications(linkedMedications.filter((_, i) => i !== index));
};
```

### 3.8 Briefinhalt-Editor

**Komponente**: `BriefInhaltEditor`

**Funktionalität**:
- Rich Text Editor (z.B. `react-quill` oder Material-UI `TextField` mit `multiline`)
- Zeigt Überschriften für übernommene Dekurs-Daten
- Bearbeitbarer Inhalt
- Strukturierte Formatierung

**State**:
```typescript
const [letterContent, setLetterContent] = useState<string>('');
const [letterSections, setLetterSections] = useState<LetterSection[]>([]);
```

**LetterSection Interface**:
```typescript
interface LetterSection {
  id: string;
  title: string;
  content: string;
  source?: 'dekurs' | 'manual';
  dekursField?: string;
}
```

**Layout**:
```
<Box sx={{ mt: 3 }}>
  <Typography variant="h6" gutterBottom>
    Briefinhalt
  </Typography>
  
  {/* Dynamische Sektionen basierend auf übernommenen Dekurs-Feldern */}
  {letterSections.map(section => (
    <Box key={section.id} sx={{ mb: 3 }}>
      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
        {section.title}
      </Typography>
      <TextField
        fullWidth
        multiline
        rows={4}
        value={section.content}
        onChange={(e) => {
          updateSectionContent(section.id, e.target.value);
        }}
        placeholder={`${section.title} eingeben...`}
      />
    </Box>
  ))}
  
  {/* Zusätzliche Notizen */}
  <Box sx={{ mt: 3 }}>
    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
      Zusätzliche Notizen
    </Typography>
    <TextField
      fullWidth
      multiline
      rows={6}
      value={letterContent}
      onChange={(e) => setLetterContent(e.target.value)}
      placeholder="Weitere Informationen..."
    />
  </Box>
</Box>
```

## 4. Datenfluss

### 4.1 Initialisierung

1. **Dialog öffnet** → `handleCreateLetter()` wird aufgerufen
2. **Lade Standortdaten**:
   - `currentLocation` aus Redux Store (`locationSlice`)
   - Falls nicht vorhanden: `dispatch(fetchLocations())`
3. **Lade Ärzte für Standort**:
   - API-Call: `GET /api/staff-location-assignments/location/:locationId`
   - Filtere nur Ärzte (role === 'doctor')
   - Setze ersten Arzt als `selectedDoctor` (oder primary)
4. **Lade neuesten Dekurs**:
   - Aus Redux Store: `dekursEntries[0]` (sortiert nach `entryDate`)
   - Falls nicht vorhanden: `dispatch(fetchDekursEntries({ patientId, limit: 1 }))`

### 4.2 Dekurs-Übernahme

1. **Benutzer aktiviert Checkbox** für ein Dekurs-Feld
2. **Neue Sektion wird erstellt**:
   ```typescript
   const newSection: LetterSection = {
     id: generateId(),
     title: getFieldLabel(fieldKey),
     content: latestDekursEntry[fieldKey] || '',
     source: 'dekurs',
     dekursField: fieldKey
   };
   setLetterSections([...letterSections, newSection]);
   ```
3. **Sektion wird im Editor angezeigt** und ist bearbeitbar

### 4.3 Diagnosen-Übernahme aus Dekurs

1. **Beim Öffnen des Dialogs**: Prüfe, ob aktueller Dekurs `linkedDiagnoses` hat
2. **Falls vorhanden**: Zeige Checkbox "Diagnosen aus Dekurs übernehmen"
3. **Bei Aktivierung**: Kopiere `linkedDiagnoses` aus Dekurs in `linkedDiagnoses` State
4. **Benutzer kann Diagnosen bearbeiten, hinzufügen oder entfernen**

### 4.4 Medikamenten-Übernahme aus Dekurs

1. **Beim Öffnen des Dialogs**: Prüfe, ob aktueller Dekurs `linkedMedications` hat
2. **Falls vorhanden**: Zeige Checkbox "Medikamente aus Dekurs übernehmen"
3. **Bei Aktivierung**: Kopiere `linkedMedications` aus Dekurs in `linkedMedications` State
4. **Benutzer kann Medikamente bearbeiten, hinzufügen oder entfernen**

### 4.3 Speichern

#### Als Entwurf speichern:
```typescript
const handleSaveDraft = async () => {
  const documentData = {
    type: 'sonstiges',
    title: `Patientenbrief für ${patient.firstName} ${patient.lastName}`,
    content: {
      text: generatePlainTextContent(),
      html: generateHtmlContent()
    },
    patient: {
      id: patient._id || patient.id || '',
      name: `${patient.firstName} ${patient.lastName}`,
      dateOfBirth: patient.dateOfBirth || '',
      socialSecurityNumber: patient.socialSecurityNumber
    },
    doctor: {
      id: selectedDoctor?._id || user._id || '',
      name: selectedDoctor ? `${selectedDoctor.title} ${selectedDoctor.firstName} ${selectedDoctor.lastName}` : user.name,
      title: selectedDoctor?.title || user.title,
      specialization: selectedDoctor?.specialization || user.specialization,
      email: selectedDoctor?.email || location.owner?.email || location.email,
      phone: selectedDoctor?.phone || location.owner?.phone || location.phone,
      website: selectedDoctor?.website || location.owner?.website
    },
    // Diagnosen und Medikamente als Metadaten speichern
    // (können später für Filterung/Suche verwendet werden)
    linkedDiagnoses: linkedDiagnoses,
    linkedMedications: linkedMedications,
    status: 'draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  await dispatch(createDocument(documentData));
  // Snackbar: "Patientenbrief als Entwurf gespeichert"
  handleClose();
};
```

#### Finalisieren:
```typescript
const handleSaveFinalized = async () => {
  // Gleiche Logik wie handleSaveDraft, aber:
  documentData.status = 'ready'; // Finalisiert
  // Snackbar: "Patientenbrief finalisiert"
};
```

### 4.6 HTML-Generierung

```typescript
const generateHtmlContent = (): string => {
  let html = '<div style="font-family: Arial, sans-serif;">';
  
  // Briefkopf
  html += '<div style="display: flex; justify-content: space-between; margin-bottom: 30px;">';
  if (location.logo) {
    html += `<img src="/api/uploads/${location.logo.filename}" alt="${location.name}" style="max-height: 80px;" />`;
  } else {
    html += `<h2>${location.name}</h2>`;
  }
  html += `<div style="text-align: right;">${new Date().toLocaleDateString('de-DE')}</div>`;
  html += '</div>';
  
  // Arztdaten
  html += '<div style="margin-bottom: 20px;">';
  html += `<p><strong>${selectedDoctor?.title || ''} ${selectedDoctor?.firstName || ''} ${selectedDoctor?.lastName || ''}</strong></p>`;
  html += `<p>${location.address_line1}${location.address_line2 ? ', ' + location.address_line2 : ''}</p>`;
  html += `<p>${location.postal_code} ${location.city}</p>`;
  if (selectedDoctor?.phone || location.owner?.phone || location.phone) {
    html += `<p>Tel: ${selectedDoctor?.phone || location.owner?.phone || location.phone}</p>`;
  }
  if (selectedDoctor?.email || location.owner?.email || location.email) {
    html += `<p>Email: ${selectedDoctor?.email || location.owner?.email || location.email}</p>`;
  }
  if (selectedDoctor?.website || location.owner?.website) {
    html += `<p>Web: ${selectedDoctor?.website || location.owner?.website}</p>`;
  }
  html += '</div>';
  
  // Diagnosen (falls vorhanden)
  if (linkedDiagnoses.length > 0) {
    html += '<div style="margin-top: 30px; margin-bottom: 20px;">';
    html += '<h3>Diagnosen</h3>';
    html += '<ul>';
    linkedDiagnoses.forEach(diag => {
      html += `<li><strong>${diag.icd10Code}</strong> - ${diag.display}`;
      if (diag.isPrimary) html += ' <em>(Hauptdiagnose)</em>';
      if (diag.notes) html += `<br/><small>${diag.notes}</small>`;
      html += '</li>';
    });
    html += '</ul>';
    html += '</div>';
  }
  
  // Medikamente (falls vorhanden)
  if (linkedMedications.length > 0) {
    html += '<div style="margin-top: 30px; margin-bottom: 20px;">';
    html += '<h3>Medikamente</h3>';
    html += '<ul>';
    linkedMedications.forEach(med => {
      html += `<li><strong>${med.name}</strong>`;
      if (med.dosage && med.dosageUnit) html += ` - ${med.dosage} ${med.dosageUnit}`;
      if (med.frequency) html += `, ${med.frequency}`;
      if (med.instructions) html += `<br/><small>${med.instructions}</small>`;
      html += '</li>';
    });
    html += '</ul>';
    html += '</div>';
  }
  
  // Briefinhalt
  html += '<div style="margin-top: 30px;">';
  letterSections.forEach(section => {
    html += `<h3>${section.title}</h3>`;
    html += `<p style="white-space: pre-wrap;">${section.content}</p>`;
  });
  if (letterContent) {
    html += '<h3>Zusätzliche Notizen</h3>';
    html += `<p style="white-space: pre-wrap;">${letterContent}</p>`;
  }
  html += '</div>';
  
  html += '</div>';
  return html;
};
```

## 5. Technische Details

### 5.1 API-Endpunkte

- `GET /api/staff-location-assignments/location/:locationId` - Ärzte für Standort
- `GET /api/dekurs/patient/:patientId?limit=1` - Neuester Dekurs-Eintrag
- `GET /api/uploads/:filename` - Logo-Datei
- `POST /api/documents` - Dokument erstellen

### 5.2 Redux Store

- `locationSlice`: `currentLocation`
- `dekursSlice`: `dekursEntries` (sortiert nach `entryDate` desc)
- `documentSlice`: `createDocument` thunk

### 5.3 Komponenten-Struktur

```
PatientOrganizer.tsx
  └── PatientenbriefDialog.tsx (neue Komponente)
      ├── BriefkopfSection.tsx
      ├── ArztAuswahlSection.tsx
      ├── StandortDatenSection.tsx
      ├── DekursUebernahmeSection.tsx
      ├── DiagnosenSection.tsx
      │   └── ICD10Autocomplete.tsx (wiederverwendet)
      ├── MedikamentenSection.tsx
      │   └── MedicationAutocomplete.tsx (wiederverwendet)
      └── BriefInhaltEditor.tsx
```

### 5.4 Wiederverwendete Komponenten

- **ICD10Autocomplete**: Bereits vorhanden, wird für Diagnosen-Suche verwendet
- **MedicationAutocomplete**: Bereits vorhanden, wird für Medikamenten-Suche verwendet
- **LinkedDiagnosis Interface**: Aus `dekursSlice.ts`
- **LinkedMedication Interface**: Aus `dekursSlice.ts`

## 6. Benutzer-Workflow

1. **Benutzer klickt auf "Patienten-/Arztbrief"** → Dialog öffnet
2. **Briefkopf wird angezeigt** (Logo + Datum)
3. **Arztauswahl** (falls mehrere Ärzte)
4. **Standortdaten werden angezeigt**
5. **Benutzer wählt Dekurs-Felder aus** → Daten werden in Editor übernommen
6. **Benutzer kann Diagnosen aus Dekurs übernehmen** → Diagnosen werden angezeigt und können bearbeitet werden
7. **Benutzer kann Medikamente aus Dekurs übernehmen** → Medikamente werden angezeigt und können bearbeitet werden
8. **Benutzer kann neue Diagnosen hinzufügen** (über ICD10Autocomplete)
9. **Benutzer kann neue Medikamente hinzufügen** (über MedicationAutocomplete)
10. **Benutzer bearbeitet Inhalte** im Editor
11. **Benutzer kann "Drucken" klicken** → Druckvorschau öffnet sich in neuem Fenster
12. **Benutzer klickt "Als Entwurf speichern"** oder **"Finalisieren"**
13. **Dokument wird erstellt** mit allen Diagnosen, Medikamenten und Inhalten
14. **Dokument wird in Dokumentenliste angezeigt**

## 7. Offene Fragen / Entscheidungen

1. **Rich Text Editor**: Soll ein vollständiger Rich Text Editor (z.B. `react-quill`) verwendet werden oder reicht ein einfaches `TextField` mit `multiline`?
2. **Dekurs-Feld-Mapping**: Sollen alle Dekurs-Felder übernommen werden können oder nur bestimmte?
3. **Vorlagen**: Sollen Briefvorlagen unterstützt werden?
4. **PDF-Export**: Soll direkt ein PDF generiert werden können?
5. **Validierung**: Sollen bestimmte Felder als Pflichtfelder markiert werden?
6. **Diagnosen/Medikamente Speicherung**: Wie sollen Diagnosen und Medikamente im Dokument gespeichert werden? 
   - Option A: Als Teil des `content.html` (nur für Anzeige)
   - Option B: Als separate Metadaten im Dokument (für Filterung/Suche)
   - Option C: Beides (Anzeige + Metadaten)
7. **Synchronisation**: Sollen Diagnosen/Medikamente aus dem Patientenbrief automatisch mit `PatientDiagnosis` synchronisiert werden (wie im Dekurs)?

## 8. Testfälle

- Patientenbrief mit Logo erstellen
- Patientenbrief ohne Logo erstellen
- Patientenbrief mit mehreren Ärzten (Auswahl)
- Patientenbrief mit nur einem Arzt (keine Auswahl)
- Patientenbrief mit Dekurs-Übernahme
- Patientenbrief ohne Dekurs-Übernahme
- Patientenbrief mit Diagnosen-Übernahme aus Dekurs
- Patientenbrief mit Medikamenten-Übernahme aus Dekurs
- Patientenbrief mit neuen Diagnosen (ohne Dekurs)
- Patientenbrief mit neuen Medikamenten (ohne Dekurs)
- Patientenbrief mit Diagnosen bearbeiten
- Patientenbrief mit Medikamenten bearbeiten
- Patientenbrief als Entwurf speichern
- Patientenbrief finalisieren
- Patientenbrief mit bearbeiteten Dekurs-Daten speichern
- Patientenbrief mit Diagnosen und Medikamenten im HTML-Output
- Patientenbrief drucken (Druckvorschau)
- Patientenbrief drucken mit Logo
- Patientenbrief drucken ohne Logo
- Patientenbrief drucken mit Diagnosen und Medikamenten

---

**Bereit für Implementierung nach Freigabe.**

