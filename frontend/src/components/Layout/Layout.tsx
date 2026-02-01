import React from 'react';
import { Box } from '@mui/material';
import { useLocation } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const isFullHeightPage = location.pathname === '/internal-messages' || location.pathname === '/chat';
  return (
    <Box
      sx={{
        flexGrow: 1,
        px: isFullHeightPage ? 0 : { xs: 2, sm: 3 }, // Symmetrisches Padding links und rechts
        py: isFullHeightPage ? 0 : { xs: 2, sm: 3 }, // Symmetrisches Padding oben und unten
        backgroundColor: 'background.default',
        overflow: isFullHeightPage ? 'hidden' : 'auto',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        width: '100%', // Volle Breite
      }}
    >
      {children}
    </Box>
  );
};

export default Layout;
