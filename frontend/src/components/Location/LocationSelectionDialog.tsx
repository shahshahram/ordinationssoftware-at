import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Typography,
  Box,
  Chip,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import {
  LocationOn,
  CheckCircle,
  Business,
} from '@mui/icons-material';
import { Location } from '../../store/slices/locationSlice';
import GradientDialogTitle from '../GradientDialogTitle';

interface LocationSelectionDialogProps {
  open: boolean;
  locations: Location[];
  primaryLocationId: string | null;
  hasNoAssignment: boolean;
  onSelect: (locationId: string, remember: boolean) => void;
  onClose?: () => void;
}

const LocationSelectionDialog: React.FC<LocationSelectionDialogProps> = ({
  open,
  locations,
  primaryLocationId,
  hasNoAssignment,
  onSelect,
  onClose,
}) => {
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(primaryLocationId);
  const [rememberSelection, setRememberSelection] = useState(true);

  useEffect(() => {
    if (primaryLocationId) {
      setSelectedLocationId(primaryLocationId);
    } else if (locations.length > 0) {
      setSelectedLocationId(locations[0]._id);
    }
  }, [primaryLocationId, locations]);

  const handleSelect = () => {
    if (selectedLocationId) {
      onSelect(selectedLocationId, rememberSelection);
    }
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        }
      }}
    >
      <GradientDialogTitle
        isEdit={false}
        title={hasNoAssignment ? "Standort auswählen" : "Standort wählen"}
        icon={<LocationOn />}
        gradientColors={{ from: '#667eea', to: '#764ba2' }}
      />
      <DialogContent sx={{ pt: 3, px: 3 }}>
        <Box>
          {hasNoAssignment && (
            <Box sx={{ mb: 2, p: 2, bgcolor: 'info.light', borderRadius: 2 }}>
              <Typography variant="body2" color="info.dark">
                Sie haben Zugriff auf alle Standorte. Bitte wählen Sie einen Standort aus.
              </Typography>
            </Box>
          )}

          {locations.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              Keine Standorte verfügbar
            </Typography>
          ) : (
            <List>
              {locations.map((location) => {
                const isSelected = selectedLocationId === location._id;
                const isPrimary = location._id === primaryLocationId;

                return (
                  <ListItemButton
                    key={location._id}
                    selected={isSelected}
                    onClick={() => setSelectedLocationId(location._id)}
                    sx={{
                      borderRadius: 2,
                      mb: 1,
                      border: isSelected ? 2 : 1,
                      borderColor: isSelected ? 'primary.main' : 'divider',
                      bgcolor: isSelected ? 'primary.light' : 'transparent',
                      '&:hover': {
                        bgcolor: isSelected ? 'primary.light' : 'action.hover',
                      }
                    }}
                  >
                    <ListItemIcon>
                      {isSelected ? (
                        <CheckCircle color="primary" />
                      ) : (
                        <LocationOn color="action" />
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body1" fontWeight={isSelected ? 600 : 400}>
                            {location.name}
                          </Typography>
                          {isPrimary && (
                            <Chip
                              label="Hauptstandort"
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                          )}
                          {location.code && (
                            <Chip
                              label={location.code}
                              size="small"
                              variant="outlined"
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box sx={{ mt: 0.5 }}>
                          {location.city && (
                            <Typography variant="caption" color="text.secondary">
                              {location.city}
                            </Typography>
                          )}
                          {location.address_line1 && (
                            <Typography variant="caption" color="text.secondary" display="block">
                              {location.address_line1}
                              {location.postal_code && `, ${location.postal_code}`}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                  </ListItemButton>
                );
              })}
            </List>
          )}

          {locations.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={rememberSelection}
                    onChange={(e) => setRememberSelection(e.target.checked)}
                  />
                }
                label="Auswahl merken"
              />
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button
          onClick={handleClose}
          sx={{ textTransform: 'none' }}
        >
          Abbrechen
        </Button>
        <Button
          onClick={handleSelect}
          variant="contained"
          disabled={!selectedLocationId}
          sx={{ textTransform: 'none' }}
        >
          Auswählen
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LocationSelectionDialog;




