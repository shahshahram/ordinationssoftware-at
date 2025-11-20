import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Divider,
  Tabs,
  Tab,
  Tooltip,
  Alert,
  CircularProgress
} from '@mui/material';
import { Favorite, FavoriteBorder, Add, Delete, Search } from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchFavorites,
  fetchPersonalLists,
  createPersonalList,
  deletePersonalList,
  addCodeToList,
  removeCodeFromList,
  addToFavorites,
  removeFromFavorites,
  fetchMostUsed,
  searchPersonalLists,
  clearError,
  setCurrentList
} from '../store/slices/icd10PersonalListsSlice';

type Props = {
  selectedCode?: { code: string; title: string; longTitle?: string; chapter?: string; isBillable?: boolean } | null;
};

const ICD10PersonalLists: React.FC<Props> = ({ selectedCode = null }) => {
  const dispatch = useAppDispatch();
  const {
    lists,
    favorites,
    currentList,
    mostUsed,
    loading,
    error,
    searchResults,
    searchLoading
  } = useAppSelector((s) => s.icd10PersonalLists);

  const [tab, setTab] = useState(0);
  const [newListName, setNewListName] = useState('');
  const [newListDescription, setNewListDescription] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    dispatch(fetchFavorites());
    dispatch(fetchPersonalLists({}));
    dispatch(fetchMostUsed(10));
  }, [dispatch]);

  const handleCreateList = async () => {
    if (!newListName.trim()) return;
    await dispatch(
      createPersonalList({
        name: newListName.trim(),
        description: newListDescription.trim() || undefined,
        type: 'custom'
      }) as any
    );
    setNewListName('');
    setNewListDescription('');
  };

  const handleDeleteList = async (id: string) => {
    await dispatch(deletePersonalList(id) as any);
  };

  const isSelectedInFavorites = useMemo(() => {
    if (!favorites || !selectedCode) return false;
    return favorites.codes.some((c) => c.code === selectedCode.code);
  }, [favorites, selectedCode]);

  const toggleFavorite = async () => {
    if (!selectedCode) return;
    if (isSelectedInFavorites) {
      await dispatch(removeFromFavorites(selectedCode.code) as any);
    } else {
      await dispatch(
        addToFavorites({
          code: selectedCode.code,
          title: selectedCode.title,
          longTitle: selectedCode.longTitle,
          chapter: selectedCode.chapter,
          isBillable: selectedCode.isBillable ?? true
        }) as any
      );
    }
  };

  const addSelectedToList = async (listId: string) => {
    if (!selectedCode) return;
    await dispatch(
      addCodeToList({
        listId,
        codeData: {
          code: selectedCode.code,
          title: selectedCode.title,
          longTitle: selectedCode.longTitle,
          chapter: selectedCode.chapter,
          isBillable: selectedCode.isBillable ?? true
        }
      }) as any
    );
  };

  const removeCodeFromCurrent = async (code: string) => {
    if (!currentList) return;
    await dispatch(removeCodeFromList({ listId: currentList._id, code }) as any);
  };

  const onSearch = async () => {
    if (query.trim().length < 2) return;
    await dispatch(searchPersonalLists({ query: query.trim() }) as any);
  };

  return (
    <Box>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">Favoriten & Persönliche Listen</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TextField
              size="small"
              placeholder="In Listen suchen…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              InputProps={{ endAdornment: <Search fontSize="small" /> }}
            />
            <Button variant="outlined" onClick={onSearch} disabled={searchLoading || query.trim().length < 2}>
              Suchen
            </Button>
            {selectedCode && (
              <Tooltip title={isSelectedInFavorites ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}>
                <IconButton color={isSelectedInFavorites ? 'error' : 'primary'} onClick={toggleFavorite}>
                  {isSelectedInFavorites ? <Favorite /> : <FavoriteBorder />}
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>
        {error && (
          <Alert severity="error" sx={{ mt: 2 }} onClose={() => dispatch(clearError()) as any}>
            {error}
          </Alert>
        )}
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth">
          <Tab label="Favoriten" />
          <Tab label="Meine Listen" />
          <Tab label="Meist verwendet" />
          <Tab label="Suchergebnisse" />
        </Tabs>
        <Divider sx={{ mb: 2 }} />

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {!loading && tab === 0 && (
          <Box>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Favoriten
            </Typography>
            {favorites && favorites.codes.length > 0 ? (
              <List dense>
                {favorites.codes.map((c) => (
                  <ListItem key={c.code} component="div">
                    <ListItemText
                      primary={
                        <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span style={{ fontWeight: 600, minWidth: 60 }}>{c.code}</span>
                          <span>{c.title}</span>
                          {c.isBillable && <Chip size="small" color="success" label="Abrechenbar" />}
                        </span>
                      }
                      secondary={
                        c.longTitle ? (
                          <span style={{ color: 'rgba(0,0,0,0.6)' }}>{c.longTitle}</span>
                        ) : undefined
                      }
                    />
                    <ListItemSecondaryAction>
                      <Tooltip title="Aus Favoriten entfernen">
                        <IconButton edge="end" onClick={() => dispatch(removeFromFavorites(c.code) as any)}>
                          <Delete />
                        </IconButton>
                      </Tooltip>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography color="text.secondary">Noch keine Favoriten.</Typography>
            )}
          </Box>
        )}

        {!loading && tab === 1 && (
          <Box>
            <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
              <TextField
                size="small"
                label="Neue Liste"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
              />
              <TextField
                size="small"
                label="Beschreibung"
                value={newListDescription}
                onChange={(e) => setNewListDescription(e.target.value)}
              />
              <Button variant="contained" startIcon={<Add />} onClick={handleCreateList} disabled={!newListName.trim()}>
                Erstellen
              </Button>
            </Box>

            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ flex: 1, minWidth: 320 }}>
                <Typography variant="subtitle1" sx={{ mb: 1 }}>
                  Meine Listen
                </Typography>
                <List dense>
                  {lists.map((l) => (
                    <ListItem
                      key={l._id}
                      component="div"
                      onClick={() => dispatch(setCurrentList(l))}
                      sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                    >
                      <ListItemText
                        primary={
                          <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <span style={{ fontWeight: 600 }}>{l.name}</span>
                            <Chip size="small" variant="outlined" label={`${l.statistics?.totalCodes ?? 0}`} />
                          </span>
                        }
                        secondary={l.description}
                      />
                      <ListItemSecondaryAction>
                        <Tooltip title="Liste löschen">
                          <IconButton edge="end" onClick={() => handleDeleteList(l._id)}>
                            <Delete />
                          </IconButton>
                        </Tooltip>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              </Box>

              <Box sx={{ flex: 2, minWidth: 420 }}>
                <Typography variant="subtitle1" sx={{ mb: 1 }}>
                  {currentList ? currentList.name : 'Liste auswählen'}
                </Typography>
                {currentList ? (
                  <>
                    {selectedCode && (
                      <Box sx={{ mb: 1 }}>
                        <Button variant="outlined" onClick={() => addSelectedToList(currentList._id)} disabled={!selectedCode}>
                          Ausgewählten Code hinzufügen
                        </Button>
                      </Box>
                    )}
                    {currentList.codes.length > 0 ? (
                      <List dense>
                        {currentList.codes.map((c) => (
                          <ListItem key={c.code} component="div">
                            <ListItemText
                              primary={
                                <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                  <span style={{ fontWeight: 600, minWidth: 60 }}>{c.code}</span>
                                  <span>{c.title}</span>
                                  {c.isBillable && <Chip size="small" color="success" label="Abrechenbar" />}
                                </span>
                              }
                              secondary={
                                c.longTitle ? (
                                  <span style={{ color: 'rgba(0,0,0,0.6)' }}>{c.longTitle}</span>
                                ) : undefined
                              }
                            />
                            <ListItemSecondaryAction>
                              <Tooltip title="Aus Liste entfernen">
                                <IconButton edge="end" onClick={() => removeCodeFromCurrent(c.code)}>
                                  <Delete />
                                </IconButton>
                              </Tooltip>
                            </ListItemSecondaryAction>
                          </ListItem>
                        ))}
                      </List>
                    ) : (
                      <Typography color="text.secondary">Diese Liste ist leer.</Typography>
                    )}
                  </>
                ) : (
                  <Typography color="text.secondary">Wählen Sie links eine Liste aus.</Typography>
                )}
              </Box>
            </Box>
          </Box>
        )}

        {!loading && tab === 2 && (
          <Box>
            {mostUsed && mostUsed.length > 0 ? (
              <List dense>
                {mostUsed.map((m) => (
                  <ListItem key={m._id} component="div">
                    <ListItemText primary={<span style={{ fontWeight: 600 }}>{m._id}</span>} secondary={`Verwendet: ${m.count}×`} />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography color="text.secondary">Keine Daten vorhanden.</Typography>
            )}
          </Box>
        )}

        {!loading && tab === 3 && (
          <Box>
            {searchLoading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                <CircularProgress size={20} />
              </Box>
            )}
            {!searchLoading && searchResults && searchResults.length > 0 ? (
              <List dense>
                {searchResults.map((l) => (
                  <ListItem key={l._id} component="div">
                    <ListItemText primary={l.name} secondary={l.description} />
                  </ListItem>
                ))}
              </List>
            ) : (
              !searchLoading && <Typography color="text.secondary">Keine Ergebnisse.</Typography>
            )}
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default ICD10PersonalLists;


