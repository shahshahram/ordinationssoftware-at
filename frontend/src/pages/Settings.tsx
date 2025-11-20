import React from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';

const Settings: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Einstellungen
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
        System- und Benutzereinstellungen
      </Typography>
      
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Allgemeine Einstellungen
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Hier können Sie die Systemeinstellungen anpassen.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Settings;
