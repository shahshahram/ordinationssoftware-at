import React, { useState, useMemo } from 'react';
import { 
  Box, 
  Typography, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemIcon, 
  Chip, 
  useMediaQuery, 
  useTheme,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Tooltip
} from '@mui/material';
import { 
  Close, 
  LocalHospital,
  People,
  CalendarToday,
  Receipt,
  TrendingUp,
  Schedule,
  Warning,
  CheckCircle,
  AttachMoney,
  EventNote,
  Assessment,
  Medication,
  Science
} from '@mui/icons-material';
import { DashboardWidget } from '../../store/slices/dashboardWidgetsSlice';

// Icon-Mapping für String-basierte Icons
const iconMap: Record<string, React.ReactNode> = {
  LocalHospital: <LocalHospital />,
  Science: <Science />,
  People: <People />,
  CalendarToday: <CalendarToday />,
  Receipt: <Receipt />,
  TrendingUp: <TrendingUp />,
  Schedule: <Schedule />,
  Warning: <Warning />,
  CheckCircle: <CheckCircle />,
  AttachMoney: <AttachMoney />,
  EventNote: <EventNote />,
  Assessment: <Assessment />,
  Medication: <Medication />
};

interface ListWidgetProps {
  widget: DashboardWidget;
  data?: Array<{
    primary: string;
    secondary?: string;
    icon?: React.ReactNode | string; // Kann React-Element oder String sein
    chip?: { label: string; color?: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' };
    details?: string;
    hint?: string;
    isNew?: boolean; // Flag für farbliche Hervorhebung neuer Items
  }>;
}

const ListWidget: React.FC<ListWidgetProps> = ({ widget, data }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // Bereinige Items: Konvertiere alle Icons zu Strings, falls sie React-Elemente sind
  const rawItems = data || widget.config?.items || [];
  const items = useMemo(() => {
    return rawItems.map((item: any) => {
      // Wenn das Icon ein Objekt ist (React-Element oder serialisiertes Objekt), konvertiere es zu einem String
      if (item.icon && typeof item.icon === 'object') {
        let iconName = 'LocalHospital';
        
        // Prüfe ob es ein serialisiertes React-Element ist (hat 'type' aber kein '$$typeof')
        if ('type' in item.icon) {
          const iconType = item.icon.type;
          
          if (typeof iconType === 'string') {
            iconName = iconType;
          } else if (iconType && typeof iconType === 'object') {
            // Versuche displayName oder name zu extrahieren
            iconName = iconType.displayName || iconType.name || 'LocalHospital';
          } else if (iconType && typeof iconType === 'function') {
            // Wenn type eine Funktion ist, versuche den Namen zu extrahieren
            iconName = iconType.displayName || iconType.name || 'LocalHospital';
          }
        }
        
        // Konvertiere immer zu String, auch wenn es ein echtes React-Element ist
        return { ...item, icon: iconName };
      }
      // Wenn es bereits ein String ist, behalte es
      return item;
    });
  }, [rawItems]);
  
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const handleIconClick = (item: any, event: React.MouseEvent) => {
    event.stopPropagation();
    if (item.details || item.hint) {
      setSelectedItem(item);
      setDetailsDialogOpen(true);
    }
  };

  const handleCloseDialog = () => {
    setDetailsDialogOpen(false);
    setSelectedItem(null);
  };

  return (
    <>
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: { xs: 1.5, sm: 2 } }}>
        <Typography 
          variant={isMobile ? 'subtitle1' : 'h6'} 
          gutterBottom 
          sx={{ fontWeight: 600, mb: 1, px: { xs: 0.5, sm: 1 } }}
        >
          {widget.title}
        </Typography>
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          <List sx={{ py: 0 }}>
            {items.map((item: any, index: number) => {
              const handleItemClick = (e: React.MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('ListWidget: Item clicked', { index, item, hasOnClick: !!item.onClick, onClickType: typeof item.onClick });
                if (item.onClick && typeof item.onClick === 'function') {
                  item.onClick(e);
                } else {
                  console.warn('ListWidget: No onClick handler for item', item);
                }
              };
              
              return (
              <ListItem 
                key={index} 
                divider={index < items.length - 1}
                onClick={handleItemClick}
                sx={{ 
                  py: { xs: 1, sm: 1.5 },
                  px: { xs: 0.5, sm: 1 },
                  cursor: item.onClick ? 'pointer' : 'default',
                  // Farbliche Hervorhebung für neue Items
                  ...(item.isNew ? {
                    bgcolor: 'action.selected',
                    borderLeft: `3px solid ${theme.palette.primary.main}`,
                    borderRadius: '4px',
                    mb: 0.5,
                    '&:hover': {
                      bgcolor: 'action.hover',
                    }
                  } : {
                    '&:hover': {
                      bgcolor: 'action.hover',
                      borderRadius: 1
                    }
                  })
                }}
              >
                {item.icon && (
                  <ListItemIcon sx={{ minWidth: { xs: 32, sm: 40 } }}>
                    {(() => {
                      // Nach der Bereinigung sollte item.icon immer ein String sein
                      const iconElement = typeof item.icon === 'string' 
                        ? (iconMap[item.icon] || <LocalHospital />)
                        : <LocalHospital />;
                      
                      return (item.details || item.hint) ? (
                        <Tooltip title={item.hint || "Details anzeigen"}>
                          <IconButton
                            size="small"
                            onClick={(e) => handleIconClick(item, e)}
                            sx={{ 
                              p: 0.5,
                              '&:hover': {
                                bgcolor: 'action.hover'
                              }
                            }}
                          >
                            {iconElement}
                          </IconButton>
                        </Tooltip>
                      ) : (
                        iconElement
                      );
                    })()}
                  </ListItemIcon>
                )}
                <ListItemText
                  primary={item.primary}
                  secondary={item.secondary}
                  primaryTypographyProps={{ 
                    variant: isMobile ? 'body2' : 'body1', 
                    fontWeight: 500 
                  }}
                  secondaryTypographyProps={{ 
                    variant: isMobile ? 'caption' : 'body2' 
                  }}
                />
                {item.chip && (
                  <Chip
                    label={item.chip.label}
                    size="small"
                    color={item.chip.color || 'default'}
                    sx={{ ml: { xs: 0.5, sm: 1 } }}
                  />
                )}
              </ListItem>
              );
            })}
          </List>
        </Box>
      </Box>

      {/* Details Dialog */}
      <Dialog
        open={detailsDialogOpen}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {selectedItem?.icon && (() => {
              let iconElement: React.ReactNode;
              if (typeof selectedItem.icon === 'string') {
                iconElement = iconMap[selectedItem.icon] || <LocalHospital />;
              } else {
                // Fallback: Sollte nicht vorkommen nach Bereinigung
                console.warn('Unexpected icon type in Dialog:', selectedItem.icon);
                iconElement = <LocalHospital />;
              }
              return iconElement;
            })()}
            <Typography variant="h6">{selectedItem?.primary}</Typography>
          </Box>
          <IconButton
            size="small"
            onClick={handleCloseDialog}
            sx={{ ml: 2 }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {selectedItem?.secondary && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {selectedItem.secondary}
            </Typography>
          )}
          {selectedItem?.details && (
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
              {selectedItem.details}
            </Typography>
          )}
          {selectedItem?.hint && !selectedItem?.details && (
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
              {selectedItem.hint}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Schließen</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ListWidget;

