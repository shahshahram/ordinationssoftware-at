import React from 'react';
import {
  Box,
  Chip,
  Stack,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Paper,
  Tooltip,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Person,
  LocalHospital,
  LocationOn,
  CalendarToday,
  Description,
  DragIndicator,
} from '@mui/icons-material';
import { getPlaceholderLegend } from '../utils/placeholders';

interface PlaceholderChipsProps {
  onPlaceholderClick?: (placeholder: string) => void;
  onPlaceholderDrag?: (placeholder: string) => void;
  enableDrag?: boolean;
}

const PlaceholderChips: React.FC<PlaceholderChipsProps> = ({
  onPlaceholderClick,
  onPlaceholderDrag,
  enableDrag = true,
}) => {
  const legend = getPlaceholderLegend();

  const handleDragStart = (e: React.DragEvent, placeholder: string) => {
    if (!enableDrag) return;
    
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/plain', placeholder);
    e.dataTransfer.setData('text/html', placeholder);
    
    // Visuelles Feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
    
    if (onPlaceholderDrag) {
      onPlaceholderDrag(placeholder);
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
  };

  const handleClick = (placeholder: string) => {
    if (onPlaceholderClick) {
      onPlaceholderClick(placeholder);
    }
  };

  const renderChip = (item: { placeholder: string; description: string }, category: string) => {
    const chip = (
      <Chip
        key={item.placeholder}
        label={item.placeholder}
        size="small"
        draggable={enableDrag}
        onDragStart={(e) => handleDragStart(e, item.placeholder)}
        onDragEnd={handleDragEnd}
        onClick={() => handleClick(item.placeholder)}
        sx={{
          cursor: enableDrag ? 'grab' : 'pointer',
          '&:active': {
            cursor: enableDrag ? 'grabbing' : 'pointer',
          },
          '&:hover': {
            backgroundColor: 'primary.light',
            color: 'primary.contrastText',
          },
          transition: 'all 0.2s',
        }}
        icon={enableDrag ? <DragIndicator fontSize="small" /> : undefined}
      />
    );

    return (
      <Tooltip key={item.placeholder} title={item.description} arrow placement="top">
        {chip}
      </Tooltip>
    );
  };

  return (
    <Paper
      elevation={2}
      sx={{
        p: 2,
        maxHeight: '600px',
        overflowY: 'auto',
        backgroundColor: 'background.paper',
      }}
    >
      <Stack spacing={2}>
        <Box>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <Description color="primary" />
            <Typography variant="h6" fontWeight="bold">
              Platzhalter
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {enableDrag
              ? 'Ziehen Sie einen Platzhalter in den Editor oder klicken Sie darauf, um ihn einzufügen'
              : 'Klicken Sie auf einen Platzhalter, um ihn einzufügen'}
          </Typography>
        </Box>

        {/* Patient Platzhalter */}
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Person color="primary" />
              <Typography variant="subtitle1" fontWeight="medium">
                Patient
              </Typography>
            </Stack>
          </AccordionSummary>
          <AccordionDetails>
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 1,
              }}
            >
              {legend.patient.map((item) => renderChip(item, 'patient'))}
            </Box>
          </AccordionDetails>
        </Accordion>

        {/* Arzt Platzhalter */}
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Stack direction="row" spacing={1} alignItems="center">
              <LocalHospital color="primary" />
              <Typography variant="subtitle1" fontWeight="medium">
                Arzt
              </Typography>
            </Stack>
          </AccordionSummary>
          <AccordionDetails>
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 1,
              }}
            >
              {legend.doctor.map((item) => renderChip(item, 'doctor'))}
            </Box>
          </AccordionDetails>
        </Accordion>

        {/* Standort Platzhalter */}
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Stack direction="row" spacing={1} alignItems="center">
              <LocationOn color="primary" />
              <Typography variant="subtitle1" fontWeight="medium">
                Standort
              </Typography>
            </Stack>
          </AccordionSummary>
          <AccordionDetails>
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 1,
              }}
            >
              {legend.location.map((item) => renderChip(item, 'location'))}
            </Box>
          </AccordionDetails>
        </Accordion>

        {/* Datum/Zeit Platzhalter */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Stack direction="row" spacing={1} alignItems="center">
              <CalendarToday color="primary" />
              <Typography variant="subtitle1" fontWeight="medium">
                Datum & Zeit
              </Typography>
            </Stack>
          </AccordionSummary>
          <AccordionDetails>
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 1,
              }}
            >
              {legend.dateTime.map((item) => renderChip(item, 'dateTime'))}
            </Box>
          </AccordionDetails>
        </Accordion>

        {/* Dekurs Platzhalter */}
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Description color="primary" />
              <Typography variant="subtitle1" fontWeight="medium">
                Dekurs
              </Typography>
            </Stack>
          </AccordionSummary>
          <AccordionDetails>
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 1,
              }}
            >
              {legend.dekurs.map((item) => renderChip(item, 'dekurs'))}
            </Box>
          </AccordionDetails>
        </Accordion>
      </Stack>
    </Paper>
  );
};

export default PlaceholderChips;



