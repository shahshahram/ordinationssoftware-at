import React from 'react';
import { DialogTitle, Box, Typography, IconButton } from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Close } from '@mui/icons-material';

interface GradientDialogTitleProps {
  isEdit?: boolean;
  title: string;
  icon?: React.ReactNode;
  onClose?: () => void;
  gradientColors?: {
    from: string;
    to: string;
  };
}

const GradientDialogTitle: React.FC<GradientDialogTitleProps> = ({ 
  isEdit = false, 
  title, 
  icon,
  onClose,
  gradientColors = { from: '#667eea', to: '#764ba2' }
}) => {
  return (
    <DialogTitle 
      sx={{ 
        background: `linear-gradient(135deg, ${gradientColors.from} 0%, ${gradientColors.to} 100%)`,
        color: 'white',
        pb: 2,
        pt: 3,
        px: 3,
        m: 0,
        position: 'relative',
        zIndex: 1,
        '&.MuiDialogTitle-root': {
          padding: '24px 24px 16px 24px',
          margin: 0,
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              bgcolor: 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {icon ? (
              <Box sx={{ fontSize: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {icon}
              </Box>
            ) : (
              isEdit ? (
                <EditIcon sx={{ fontSize: 28 }} />
              ) : (
                <AddIcon sx={{ fontSize: 28 }} />
              )
            )}
          </Box>
          <Box>
            <Typography variant="h5" fontWeight="bold">
              {title}
            </Typography>
          </Box>
        </Box>
        {onClose && (
          <IconButton
            onClick={onClose}
            sx={{
              color: 'white',
              '&:hover': {
                bgcolor: 'rgba(255,255,255,0.2)',
              },
            }}
          >
            <Close />
          </IconButton>
        )}
      </Box>
    </DialogTitle>
  );
};

export default GradientDialogTitle;

