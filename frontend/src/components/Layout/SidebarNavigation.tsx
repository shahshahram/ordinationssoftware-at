import React, { useState, useEffect } from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Typography,
  IconButton,
  useMediaQuery,
  useTheme,
  Collapse,
} from '@mui/material';
import {
  Close,
  ExpandLess,
  ExpandMore,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { menuItems, MenuItem } from '../../data/menuItems';

interface SidebarNavigationProps {
  open: boolean;
  onClose: () => void;
}

const SidebarNavigation: React.FC<SidebarNavigationProps> = ({ open, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const _isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const handleNavigation = (path: string) => {
    // Navigiere nur, wenn wir nicht bereits auf dieser Seite sind
    if (location.pathname !== path) {
      navigate(path);
    } else {
      // Wenn wir bereits auf dieser Seite sind, schließe die Sidebar trotzdem
      onClose();
    }
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

  // Schließe die Sidebar, wenn sich die Location ändert (nach Navigation)
  useEffect(() => {
    if (open) {
      onClose();
    }
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const drawerContent = (
    <Box sx={{ width: 240, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <a 
            href="https://mymedicloud.at" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              textDecoration: 'none',
              cursor: 'pointer'
            }}
          >
            <img 
              src="/logo-horizontal.svg" 
              alt="MyMediCloud MMC" 
              style={{ height: '32px', width: 'auto' }}
            />
          </a>
        </Box>
        <IconButton onClick={onClose} size="small">
          <Close />
        </IconButton>
      </Box>

      {/* Navigation */}
      <List sx={{ flexGrow: 1, pt: 1, overflowY: 'auto' }}>
        {menuItems.map((item) => {
          const isActive = isItemActive(item);
          const isExpanded = expandedItems.includes(item.text);
          
          return (
            <React.Fragment key={item.text}>
              <ListItem disablePadding>
                <ListItemButton
                  onClick={() => {
                    if (item.subItems) {
                      handleToggleExpand(item.text);
                    } else {
                      handleNavigation(item.path);
                    }
                  }}
                  sx={{
                    mx: 1,
                    borderRadius: 1,
                    backgroundColor: isActive ? 'primary.main' : 'transparent',
                    color: isActive ? 'white' : 'text.primary',
                    '&:hover': {
                      backgroundColor: isActive ? 'primary.dark' : 'action.hover',
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      color: isActive ? 'white' : 'text.secondary',
                      minWidth: 40,
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.text}
                    primaryTypographyProps={{
                      fontSize: '0.875rem',
                      fontWeight: isActive ? 600 : 400,
                    }}
                  />
                  {item.subItems && (
                    isExpanded ? <ExpandLess /> : <ExpandMore />
                  )}
                </ListItemButton>
              </ListItem>
              
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
                                mx: 1,
                                ml: 4,
                                borderRadius: 1,
                                backgroundColor: isSubActive ? 'primary.main' : 'transparent',
                                color: isSubActive ? 'white' : 'text.primary',
                                '&:hover': {
                                  backgroundColor: isSubActive ? 'primary.dark' : 'action.hover',
                                },
                              }}
                            >
                              <ListItemIcon
                                sx={{
                                  color: isSubActive ? 'white' : 'text.secondary',
                                  minWidth: 40,
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
                                isNestedExpanded ? <ExpandLess /> : <ExpandMore />
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
                                          mx: 1,
                                          ml: 8,
                                          borderRadius: 1,
                                          backgroundColor: isNestedActive ? 'primary.main' : 'transparent',
                                          color: isNestedActive ? 'white' : 'text.primary',
                                          '&:hover': {
                                            backgroundColor: isNestedActive ? 'primary.dark' : 'action.hover',
                                          },
                                        }}
                                      >
                                        <ListItemIcon
                                          sx={{
                                            color: isNestedActive ? 'white' : 'text.secondary',
                                            minWidth: 40,
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
            </React.Fragment>
          );
        })}
      </List>

      {/* Footer */}
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        <Typography variant="caption" color="text.secondary" align="center" display="block">
          Version 1.0.0
        </Typography>
        <Typography variant="caption" color="text.secondary" align="center" display="block">
          DSGVO-konform
        </Typography>
      </Box>
    </Box>
  );

  return (
    <>
      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={open}
        onClose={onClose}
        ModalProps={{
          keepMounted: true,
          disableAutoFocus: true,
          disableEnforceFocus: true,
          disableRestoreFocus: true,
        }}
        sx={{
          display: { xs: 'block', sm: 'none' },
          zIndex: (theme) => theme.zIndex.drawer, // Standard z-index für Drawer
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: 240,
            zIndex: (theme) => theme.zIndex.drawer, // Standard z-index für Drawer
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Desktop Drawer */}
      {open && (
        <Drawer
          variant="persistent"
          open={open}
          ModalProps={{
            disableAutoFocus: true,
            disableEnforceFocus: true,
            disableRestoreFocus: true,
          }}
          sx={{
            display: { xs: 'none', sm: 'block' },
            zIndex: (theme) => theme.zIndex.drawer,
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: 240,
              position: 'relative',
              height: '100vh',
              zIndex: (theme) => theme.zIndex.drawer,
            },
          }}
        >
          {drawerContent}
        </Drawer>
      )}
    </>
  );
};

export default SidebarNavigation;
