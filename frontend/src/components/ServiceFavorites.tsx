import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  AccessTime as TimeIcon,
  Euro as EuroIcon,
  LocationOn as LocationIcon
} from '@mui/icons-material';

interface ServiceFavorite {
  _id: string;
  code: string;
  name: string;
  description?: string;
  category?: string;
  base_duration_min: number;
  buffer_before_min: number;
  buffer_after_min: number;
  price_cents?: number;
  color_hex?: string;
  location_id?: {
    _id: string;
    name: string;
    code: string;
  };
}

interface ServiceFavoritesProps {
  locationId?: string;
  onServiceSelect?: (service: ServiceFavorite) => void;
  showActions?: boolean;
}

const ServiceFavorites: React.FC<ServiceFavoritesProps> = ({
  locationId,
  onServiceSelect,
  showActions = true
}) => {
  const [favorites, setFavorites] = useState<ServiceFavorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFavorites = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (locationId) params.append('location_id', locationId);
      
      const response = await fetch(`/api/service-catalog/favorites?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Fehler beim Laden der Favoriten');
      }
      
      const data = await response.json();
      setFavorites(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFavorites();
  }, [locationId]);

  const formatDuration = (service: ServiceFavorite) => {
    const duration = service.base_duration_min || 0;
    const bufferBefore = service.buffer_before_min || 0;
    const bufferAfter = service.buffer_after_min || 0;
    const total = duration + bufferBefore + bufferAfter;
    return `${total} Min (${duration} + ${bufferBefore} + ${bufferAfter})`;
  };

  const formatPrice = (priceCents?: number) => {
    if (!priceCents) return 'Preis auf Anfrage';
    return `€${(priceCents / 100).toFixed(2)}`;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  if (favorites.length === 0) {
    return (
      <Card>
        <CardContent>
          <Typography variant="body2" color="text.secondary" align="center">
            Keine Favoriten verfügbar
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <StarIcon color="primary" />
        Schnellauswahl - Favoriten
      </Typography>
      
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 2 }}>
        {favorites.map((service) => (
          <Box key={service._id}>
            <Card 
              sx={{ 
                cursor: onServiceSelect ? 'pointer' : 'default',
                transition: 'all 0.2s',
                '&:hover': onServiceSelect ? {
                  transform: 'translateY(-2px)',
                  boxShadow: 3
                } : {}
              }}
              onClick={() => onServiceSelect?.(service)}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                      sx={{
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        backgroundColor: service.color_hex || '#2563EB',
                        border: '1px solid #ccc'
                      }}
                    />
                    <Typography variant="subtitle2" fontWeight="bold">
                      {service.code}
                    </Typography>
                  </Box>
                  {showActions && (
                    <Tooltip title="Favorit">
                      <IconButton size="small" color="primary">
                        <StarIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
                
                <Typography variant="h6" gutterBottom>
                  {service.name}
                </Typography>
                
                {service.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {service.description}
                  </Typography>
                )}
                
                {service.category && (
                  <Chip 
                    label={service.category} 
                    size="small" 
                    sx={{ mb: 1 }}
                  />
                )}
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <TimeIcon fontSize="small" color="action" />
                    <Typography variant="caption">
                      {formatDuration(service)}
                    </Typography>
                  </Box>
                  
                  {service.price_cents && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <EuroIcon fontSize="small" color="action" />
                      <Typography variant="caption">
                        {formatPrice(service.price_cents)}
                      </Typography>
                    </Box>
                  )}
                  
                  {service.location_id && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <LocationIcon fontSize="small" color="action" />
                      <Typography variant="caption">
                        {service.location_id.name} ({service.location_id.code})
                      </Typography>
                    </Box>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default ServiceFavorites;
