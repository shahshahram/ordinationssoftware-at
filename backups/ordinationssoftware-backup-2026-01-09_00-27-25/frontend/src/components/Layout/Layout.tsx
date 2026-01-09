import React from 'react';
import { Box, Container } from '@mui/material';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <Box
      component="main"
      sx={{
        flexGrow: 1,
        p: 3,
        backgroundColor: 'background.default',
        overflow: 'auto',
        height: '100%',
      }}
    >
      <Container maxWidth="xl" sx={{ height: '100%' }}>
        {children}
      </Container>
    </Box>
  );
};

export default Layout;
