import React, { useState, useEffect } from 'react';
import {
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Collapse,
  Paper,
} from '@mui/material';
import {
  ExpandLess,
  ExpandMore,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { menuItems, MenuItem } from '../../data/menuItems';

interface DropdownNavigationProps {
  open: boolean;
  onClose: () => void;
}

const DropdownNavigation: React.FC<DropdownNavigationProps> = ({ open, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const handleNavigation = (path: string) => {
    navigate(path);
    onClose();
  };

  const handleToggleExpand = (itemText: string) => {
    setExpandedItems(prev => 
      prev.includes(itemText) 
        ? prev.filter(item => item !== itemText)
        : [...prev, itemText]
    );
  };

  const isItemActive = (item: MenuItem): boolean => {
    if (item.subItems) {
      return item.subItems.some((subItem) => {
        if (subItem.subItems) {
          return subItem.subItems.some((nestedItem) => location.pathname === nestedItem.path);
        }
        return location.pathname === subItem.path;
      });
    }
    return location.pathname === item.path;
  };

  // Click-Outside Handler
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-navigation-panel]') && !target.closest('[aria-label="open navigation"]')) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open, onClose]);

  const navigationContent = (
    <Box sx={{ width: '100%', p: 2 }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(3, 1fr)',
            lg: 'repeat(4, 1fr)',
          },
          gap: 2,
        }}
      >
        {menuItems.map((item) => {
          const isActive = isItemActive(item);
          const isExpanded = expandedItems.includes(item.text);
          
          return (
            <Box key={item.text}>
              <Box
                sx={{
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                  overflow: 'hidden',
                  mb: 1,
                }}
              >
                <ListItemButton
                  onClick={() => {
                    if (item.subItems) {
                      handleToggleExpand(item.text);
                    } else {
                      handleNavigation(item.path);
                    }
                  }}
                  sx={{
                    borderRadius: 0,
                    backgroundColor: isActive ? 'primary.main' : 'background.paper',
                    color: isActive ? 'white' : 'text.primary',
                    '&:hover': {
                      backgroundColor: isActive ? 'primary.dark' : 'action.hover',
                    },
                    py: 1.5,
                  }}
                >
                  <ListItemIcon
                    sx={{
                      color: isActive ? 'white' : 'primary.main',
                      minWidth: 40,
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.text}
                    primaryTypographyProps={{
                      fontSize: '0.875rem',
                      fontWeight: isActive ? 600 : 500,
                    }}
                  />
                  {item.subItems && (
                    isExpanded ? <ExpandLess /> : <ExpandMore />
                  )}
                </ListItemButton>
                
                {/* Submenu */}
                {item.subItems && (
                  <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding>
                      {item.subItems.map((subItem) => {
                        const isSubActive = location.pathname === subItem.path;
                        const hasNestedItems = subItem.subItems && subItem.subItems.length > 0;
                        const isNestedExpanded = expandedItems.includes(subItem.text);
                        
                        return (
                          <React.Fragment key={subItem.text}>
                            <ListItem disablePadding>
                              <ListItemButton
                                onClick={() => {
                                  if (hasNestedItems) {
                                    handleToggleExpand(subItem.text);
                                  } else {
                                    handleNavigation(subItem.path);
                                  }
                                }}
                                sx={{
                                  pl: 4,
                                  py: 1,
                                  borderRadius: 0,
                                  backgroundColor: isSubActive ? 'primary.light' : 'transparent',
                                  color: isSubActive ? 'white' : 'text.primary',
                                  '&:hover': {
                                    backgroundColor: isSubActive ? 'primary.main' : 'action.hover',
                                  },
                                }}
                              >
                                <ListItemIcon
                                  sx={{
                                    color: isSubActive ? 'white' : 'text.secondary',
                                    minWidth: 36,
                                  }}
                                >
                                  {subItem.icon}
                                </ListItemIcon>
                                <ListItemText
                                  primary={subItem.text}
                                  primaryTypographyProps={{
                                    fontSize: '0.8rem',
                                    fontWeight: isSubActive ? 600 : 400,
                                  }}
                                />
                                {hasNestedItems && (
                                  isNestedExpanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />
                                )}
                              </ListItemButton>
                            </ListItem>
                            
                            {/* Nested Submenu */}
                            {hasNestedItems && subItem.subItems && (
                              <Collapse in={isNestedExpanded} timeout="auto" unmountOnExit>
                                <List component="div" disablePadding>
                                  {subItem.subItems.map((nestedItem) => {
                                    const isNestedActive = location.pathname === nestedItem.path;
                                    return (
                                      <ListItem key={nestedItem.text} disablePadding>
                                        <ListItemButton
                                          onClick={() => handleNavigation(nestedItem.path)}
                                          sx={{
                                            pl: 6,
                                            py: 0.75,
                                            borderRadius: 0,
                                            backgroundColor: isNestedActive ? 'primary.light' : 'transparent',
                                            color: isNestedActive ? 'white' : 'text.secondary',
                                            '&:hover': {
                                              backgroundColor: isNestedActive ? 'primary.main' : 'action.hover',
                                            },
                                          }}
                                        >
                                          <ListItemIcon
                                            sx={{
                                              color: isNestedActive ? 'white' : 'text.secondary',
                                              minWidth: 32,
                                            }}
                                          >
                                            {nestedItem.icon}
                                          </ListItemIcon>
                                          <ListItemText
                                            primary={nestedItem.text}
                                            primaryTypographyProps={{
                                              fontSize: '0.75rem',
                                              fontWeight: isNestedActive ? 600 : 400,
                                            }}
                                          />
                                        </ListItemButton>
                                      </ListItem>
                                    );
                                  })}
                                </List>
                              </Collapse>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </List>
                  </Collapse>
                )}
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );

  if (!open) return null;

  return (
    <Collapse in={open} timeout={300}>
      <Paper
        elevation={4}
        data-navigation-panel
        sx={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          zIndex: 1100,
          maxHeight: { xs: 'calc(100vh - 64px)', sm: '70vh' },
          overflowY: 'auto',
          borderTop: 1,
          borderColor: 'divider',
          borderRadius: 0,
          backgroundColor: 'background.paper',
        }}
      >
        {navigationContent}
      </Paper>
    </Collapse>
  );
};

export default DropdownNavigation;
