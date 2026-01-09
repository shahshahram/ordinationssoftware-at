import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Alert,
  Divider,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Paper,
  Tabs,
  Tab
} from '@mui/material';
import {
  Search as SearchIcon,
  MedicalServices as MedicalIcon,
  Receipt as ReceiptIcon,
  Assessment as AssessmentIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Star as StarIcon,
  AccountTree as AccountTreeIcon
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  searchIcd10Codes,
  getTopIcd10Codes,
  getRecentIcd10Codes,
  getIcd10Chapters,
  getIcd10Analytics,
  clearError
} from '../store/slices/icd10Slice';
import {
  createDiagnosis,
  fetchPatientDiagnoses,
  deleteDiagnosis
} from '../store/slices/diagnosisSlice';
import ICD10Autocomplete from '../components/ICD10Autocomplete';
import EnhancedICD10Autocomplete from '../components/EnhancedICD10Autocomplete';
import SimpleICD10Search from '../components/SimpleICD10Search';
import DirectICD10Search from '../components/DirectICD10Search';
import DiagnosisManager from '../components/DiagnosisManager';
import ICD10Hierarchy from '../components/ICD10Hierarchy';

const ICD10Demo: React.FC = () => {
  const dispatch = useAppDispatch();
  const {
    searchResults,
    topCodes,
    recentCodes,
    chapters,
    analytics,
    loading,
    error
  } = useAppSelector(state => state.icd10);

  const {
    patientDiagnoses,
    loading: diagnosisLoading,
    error: diagnosisError
  } = useAppSelector(state => state.diagnoses);

  const [activeTab, setActiveTab] = useState(0);
  const [selectedCode, setSelectedCode] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChapters, setSelectedChapters] = useState<string[]>([]);

  // Demo patient ID
  const demoPatientId = '507f1f77bcf86cd799439011';

  // Load initial data
  useEffect(() => {
    dispatch(getTopIcd10Codes({ scope: 'global', limit: 10 }));
    dispatch(getRecentIcd10Codes({ scope: 'global', limit: 10 }));
    dispatch(getIcd10Chapters(new Date().getFullYear()));
    dispatch(getIcd10Analytics({ scope: 'global' }));
    dispatch(fetchPatientDiagnoses({ patientId: demoPatientId }));
  }, [dispatch]);

  // Handle search
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.length >= 3) {
      dispatch(searchIcd10Codes({
        q: query,
        chapters: selectedChapters.length > 0 ? selectedChapters : undefined,
        limit: 20
      }));
    }
  };

  // Handle code selection
  const handleCodeSelect = (code: string, display: string, fullCode: any) => {
    setSelectedCode(fullCode);
  };

  // Handle chapter filter
  const handleChapterToggle = (chapter: string) => {
    setSelectedChapters(prev => 
      prev.includes(chapter) 
        ? prev.filter(c => c !== chapter)
        : [...prev, chapter]
    );
  };

  // Handle add diagnosis
  const handleAddDiagnosis = async (code: string, display: string, fullCode: any) => {
    try {
      await dispatch(createDiagnosis({
        patientId: demoPatientId,
        code: fullCode.code,
        catalogYear: fullCode.releaseYear,
        display: fullCode.title,
        status: 'active',
        isPrimary: false,
        source: 'clinical'
      }));
      setSelectedCode(null);
    } catch (error) {
      console.error('Error adding diagnosis:', error);
    }
  };

  // Clear errors
  useEffect(() => {
    if (error) {
      setTimeout(() => dispatch(clearError()), 5000);
    }
  }, [error, dispatch]);

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        ICD-10 Diagnoseerfassung - Demo
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Testen Sie die neue ICD-10 Diagnoseerfassung mit Autocomplete, Favoriten, Hierarchie-Navigation und Diagnose-Management.
      </Typography>

      {/* Tab Navigation */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          variant="fullWidth"
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab
            icon={<SearchIcon />}
            label="Code-Suche"
            iconPosition="start"
          />
          <Tab
            icon={<AccountTreeIcon />}
            label="Hierarchie-Navigation"
            iconPosition="start"
          />
          <Tab
            icon={<MedicalIcon />}
            label="Diagnose-Management"
            iconPosition="start"
          />
        </Tabs>
      </Paper>

      {/* Error Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => dispatch(clearError())}>
          {error}
        </Alert>
      )}

      {diagnosisError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {diagnosisError}
        </Alert>
      )}

      {/* Tab Content */}
      {activeTab === 0 && (
        <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
          {/* Left Column - Search and Results */}
          <Box sx={{ flex: 2 }}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <SearchIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                ICD-10 Code-Suche
              </Typography>
              
              {/* Search Input - Standard */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Standard-Suche:
                </Typography>
                <ICD10Autocomplete
                  onSelect={handleCodeSelect}
                  context="medical"
                  placeholder="ICD-10 Code oder Beschreibung eingeben..."
                  fullWidth
                  onChange={handleSearch}
                />
              </Box>

              {/* Search Input - Enhanced */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Erweiterte Suche (mit Validierung):
                </Typography>
                <EnhancedICD10Autocomplete
                  onSelect={handleCodeSelect}
                  label="ICD-10 Code (mit Validierung)"
                  placeholder="Code oder Beschreibung eingeben..."
                  context="clinical"
                  patientId={demoPatientId}
                  encounterId="demo-encounter-1"
                  requireBillable={false}
                  currentYear={2025}
                  showValidation={true}
                  showSuggestions={true}
                />
              </Box>

              {/* Simple Debug Search */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Debug-Suche (einfach):
                </Typography>
                <SimpleICD10Search />
              </Box>

              {/* Direct API Search */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Direkte API-Suche (ohne Redux):
                </Typography>
                <DirectICD10Search />
              </Box>

              {/* Chapter Filters */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Kapitel filtern:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {chapters.map((chapter) => (
                    <Chip
                      key={chapter._id}
                      label={`${chapter._id} (${chapter.count})`}
                      onClick={() => handleChapterToggle(chapter._id)}
                      color={selectedChapters.includes(chapter._id) ? 'primary' : 'default'}
                      variant={selectedChapters.includes(chapter._id) ? 'filled' : 'outlined'}
                    />
                  ))}
                </Box>
              </Box>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Suchergebnisse ({searchResults.length}):
                  </Typography>
                  <List dense>
                    {searchResults.map((code, index) => (
                      <ListItem
                        key={code._id}
                        component="div"
                        onClick={() => handleCodeSelect(code.code, code.title, code)}
                        sx={{
                          border: 1,
                          borderColor: 'divider',
                          borderRadius: 1,
                          mb: 1,
                          bgcolor: selectedCode?._id === code._id ? 'primary.50' : 'background.paper',
                          cursor: 'pointer',
                          '&:hover': {
                            bgcolor: 'action.hover'
                          }
                        }}
                      >
                        <ListItemText
                          primary={
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontWeight: 'bold', color: '#1976d2', minWidth: '60px' }}>
                                {code.code}
                              </span>
                              <span style={{ flex: 1 }}>
                                {code.title}
                              </span>
                              {!code.isBillable && (
                                <Chip label="Sammelcode" size="small" color="warning" variant="outlined" />
                              )}
                              {code.isBillable && (
                                <Chip label="Abrechenbar" size="small" color="success" variant="outlined" />
                              )}
                            </span>
                          }
                          secondary={
                            <span>
                              {code.longTitle && (
                                <span style={{ fontSize: '0.75rem', color: 'rgba(0, 0, 0, 0.6)' }}>
                                  {code.longTitle}
                                </span>
                              )}
                              {code.synonyms && code.synonyms.length > 0 && (
                                <span style={{ fontSize: '0.75rem', color: 'rgba(0, 0, 0, 0.6)', display: 'block', marginTop: '4px' }}>
                                  Synonyme: {code.synonyms.join(', ')}
                                </span>
                              )}
                            </span>
                          }
                        />
                        <ListItemSecondaryAction>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<AddIcon />}
                            onClick={() => handleAddDiagnosis(code.code, code.title, code)}
                          >
                            Hinzufügen
                          </Button>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Top Codes and Recent Codes */}
          <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
            <Box sx={{ flex: 1 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    <StarIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Häufig verwendete Codes
                  </Typography>
                  {topCodes.length > 0 ? (
                    <List dense>
                      {topCodes.map((code, index) => (
                        <ListItem
                          key={code._id}
                          component="div"
                          onClick={() => handleCodeSelect(code.code, code.title, code)}
                          sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                        >
                          <ListItemText
                            primary={
                              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontWeight: 'bold', color: '#1976d2', minWidth: '50px' }}>
                                  {code.code}
                                </span>
                                <span style={{ flex: 1 }}>
                                  {code.title}
                                </span>
                                <span style={{ fontSize: '0.75rem', color: 'rgba(0, 0, 0, 0.6)' }}>
                                  {code.count}x
                                </span>
                              </span>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Keine Daten verfügbar
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Box>

            <Box sx={{ flex: 1 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    <AssessmentIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Kürzlich verwendet
                  </Typography>
                  {recentCodes.length > 0 ? (
                    <List dense>
                      {recentCodes.map((code, index) => (
                        <ListItem
                          key={code._id}
                          component="div"
                          onClick={() => handleCodeSelect(code.code, code.title, code)}
                          sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                        >
                          <ListItemText
                            primary={
                              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontWeight: 'bold', color: '#1976d2', minWidth: '50px' }}>
                                  {code.code}
                                </span>
                                <span style={{ flex: 1 }}>
                                  {code.title}
                                </span>
                              </span>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Keine Daten verfügbar
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Box>
          </Box>
        </Box>

        {/* Right Column - Selected Code and Analytics */}
        <Box sx={{ flex: 1 }}>
          {/* Selected Code Details */}
          {selectedCode && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <MedicalIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Ausgewählter Code
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="h5" color="primary" sx={{ fontWeight: 'bold' }}>
                    {selectedCode.code}
                  </Typography>
                  <Typography variant="h6" sx={{ mt: 1 }}>
                    {selectedCode.title}
                  </Typography>
                  {selectedCode.longTitle && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      {selectedCode.longTitle}
                    </Typography>
                  )}
                </Box>
                
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <Chip
                    label={selectedCode.isBillable ? 'Abrechenbar' : 'Sammelcode'}
                    color={selectedCode.isBillable ? 'success' : 'warning'}
                    variant="outlined"
                  />
                  <Chip
                    label={`Kapitel ${selectedCode.chapter}`}
                    color="primary"
                    variant="outlined"
                  />
                </Box>

                {selectedCode.synonyms && selectedCode.synonyms.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Synonyme:
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selectedCode.synonyms.map((synonym: string, index: number) => (
                        <Chip key={index} label={synonym} size="small" variant="outlined" />
                      ))}
                    </Box>
                  </Box>
                )}

                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => handleAddDiagnosis(selectedCode.code, selectedCode.title, selectedCode)}
                  disabled={diagnosisLoading}
                >
                  Als Diagnose hinzufügen
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Analytics */}
          {analytics && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <AssessmentIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Statistiken
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">Gesamt Codes:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      {analytics.totalCodes}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">Gesamt Nutzung:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      {analytics.totalUsage}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">Ø Nutzung:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      {analytics.averageUsage?.toFixed(1)}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          )}
        </Box>
      </Box>
      )}

      {/* Tab 1: Hierarchie-Navigation */}
      {activeTab === 1 && (
        <Box>
          <ICD10Hierarchy
            onCodeSelect={(code) => handleCodeSelect(code.code, code.title, code)}
            selectedCode={selectedCode}
            year={2025}
            showBreadcrumb={true}
            showRelated={true}
            showSiblings={true}
            compact={false}
          />
        </Box>
      )}

      {/* Tab 2: Diagnose-Management */}
      {activeTab === 2 && (
        <Box>
          <DiagnosisManager
            patientId={demoPatientId}
            allowEdit={true}
            showPrimaryToggle={true}
            context="medical"
          />
        </Box>
      )}
    </Container>
  );
};

export default ICD10Demo;
