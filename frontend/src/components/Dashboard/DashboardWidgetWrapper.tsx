import React, { useState } from 'react';
import {
  Card,
  CardHeader,
  CardContent,
  IconButton,
  Menu,
  MenuItem,
  Typography,
} from '@mui/material';
import { MoreVert as MoreVertIcon, Settings, Delete } from '@mui/icons-material';

export interface DashboardWidgetWrapperProps {
  title: string;
  children: React.ReactNode;
  onRemove: () => void;
  onEdit?: () => void;
}

const DashboardWidgetWrapper: React.FC<DashboardWidgetWrapperProps> = ({
  title,
  children,
  onRemove,
  onEdit,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(anchorEl);

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  const handleEdit = () => {
    onEdit?.();
    handleCloseMenu();
  };

  const handleRemove = () => {
    onRemove();
    handleCloseMenu();
  };

  return (
    <Card
      elevation={2}
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        borderRadius: { xs: 1, sm: 2 },
        boxSizing: 'border-box',
      }}
    >
      <CardHeader
        title={
          <Typography variant="h6" component="span" noWrap>
            {title}
          </Typography>
        }
        action={
          <IconButton
            aria-label="Widget-Menü öffnen"
            aria-controls={menuOpen ? 'widget-menu' : undefined}
            aria-haspopup="true"
            aria-expanded={menuOpen ? 'true' : undefined}
            onClick={handleOpenMenu}
            size="small"
          >
            <MoreVertIcon />
          </IconButton>
        }
        sx={{
          flexShrink: 0,
          py: 1,
          px: 2,
          '& .MuiCardHeader-content': { minWidth: 0 },
        }}
      />
      <Menu
        id="widget-menu"
        anchorEl={anchorEl}
        open={menuOpen}
        onClose={handleCloseMenu}
        MenuListProps={{ 'aria-labelledby': 'widget-menu-button' }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {onEdit != null && (
          <MenuItem onClick={handleEdit}>
            <Settings sx={{ mr: 1.5, fontSize: 20 }} />
            Einstellungen
          </MenuItem>
        )}
        <MenuItem onClick={handleRemove}>
          <Delete sx={{ mr: 1.5, fontSize: 20 }} />
          Entfernen
        </MenuItem>
      </Menu>
      <CardContent
        sx={{
          flexGrow: 1,
          height: '100%',
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'auto',
          p: 0,
          '&:last-child': { pb: 0 },
        }}
      >
        {children}
      </CardContent>
    </Card>
  );
};

export default DashboardWidgetWrapper;
