import React from 'react';
import { Box, Container } from '@mui/material';
import { useLocation } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const isInternalMessages = location.pathname === '/internal-messages';
  
  return (
    <Box
      component="main"
      sx={{
        flexGrow: 1,
        p: isInternalMessages ? 0 : 3,
        backgroundColor: 'background.default',
        overflow: isInternalMessages ? 'hidden' : 'auto',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {isInternalMessages ? (
        children
      ) : (
        <Container maxWidth="xl" sx={{ height: '100%' }}>
          {children}
        </Container>
      )}
    </Box>
  );
};

export default Layout;
