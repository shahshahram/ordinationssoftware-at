import React from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';

const ELGA: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        ELGA Integration
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
        Elektronische Gesundheitsakte und e-Medikation
      </Typography>
      
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            ELGA-Services
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Hier können Sie auf ELGA-Dienste wie e-Medikation, e-Rezept und e-Befund zugreifen.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ELGA;
