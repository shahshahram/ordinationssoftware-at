import React, { useState } from 'react';
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
import { Close } from '@mui/icons-material';
import { DashboardWidget } from '../../store/slices/dashboardWidgetsSlice';

interface ListWidgetProps {
  widget: DashboardWidget;
  data?: Array<{
    primary: string;
    secondary?: string;
    icon?: React.ReactNode;
    chip?: { label: string; color?: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' };
    details?: string;
    hint?: string;
  }>;
}

const ListWidget: React.FC<ListWidgetProps> = ({ widget, data }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const items = data || widget.config?.items || [];
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
            {items.map((item: any, index: number) => (
              <ListItem 
                key={index} 
                divider={index < items.length - 1}
                sx={{ 
                  py: { xs: 1, sm: 1.5 },
                  px: { xs: 0.5, sm: 1 },
                  '&:hover': {
                    bgcolor: 'action.hover',
                    borderRadius: 1
                  }
                }}
              >
                {item.icon && (
                  <ListItemIcon sx={{ minWidth: { xs: 32, sm: 40 } }}>
                    {(item.details || item.hint) ? (
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
                          {item.icon}
                        </IconButton>
                      </Tooltip>
                    ) : (
                      item.icon
                    )}
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
            ))}
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
            {selectedItem?.icon}
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

