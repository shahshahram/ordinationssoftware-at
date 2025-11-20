import React from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';

const Reports: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Berichte
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
        Statistiken und Auswertungen
      </Typography>
      
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Statistiken
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Hier können Sie verschiedene Berichte und Statistiken einsehen.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Reports;
