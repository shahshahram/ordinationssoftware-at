// Erstattungen Widget für Dashboard

import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  CircularProgress
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  Pending,
  Send,
  AttachMoney
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface Reimbursement {
  _id: string;
  invoiceId: {
    invoiceNumber: string;
  };
  patientId: {
    firstName: string;
    lastName: string;
  };
  status: string;
  requestedReimbursement: number;
  approvedReimbursement: number;
  submittedDate?: string;
}

interface ReimbursementsWidgetProps {
  widget: any;
  data?: any;
}

const ReimbursementsWidget: React.FC<ReimbursementsWidgetProps> = ({ widget, data }) => {
  const navigate = useNavigate();
  const [reimbursements, setReimbursements] = useState<Reimbursement[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    pending: 0,
    total: 0
  });

  useEffect(() => {
    loadReimbursements();
  }, []);

  const loadReimbursements = async () => {
    setLoading(true);
    try {
      const response = await api.get<any>('/reimbursements?status=pending&limit=5');
      if ((response.data as any)?.success) {
        setReimbursements((response.data as any).data || []);
      }
      
      // Lade Statistiken
      const statsResponse = await api.get<any>('/reimbursements/stats/summary');
      if ((statsResponse.data as any)?.success) {
        const statsData = (statsResponse.data as any).data;
        setStats({
          pending: statsData?.totalPending || 0,
          total: statsData?.byStatus?.reduce((sum: number, s: any) => sum + s.count, 0) || 0
        });
      }
    } catch (error) {
      console.error('Error loading reimbursements:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
      case 'paid':
        return <CheckCircle color="success" />;
      case 'rejected':
      case 'cancelled':
        return <Cancel color="error" />;
      case 'submitted':
        return <Send color="info" />;
      case 'pending':
        return <Pending color="warning" />;
      default:
        return <AttachMoney />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
      case 'paid':
        return 'success';
      case 'rejected':
      case 'cancelled':
        return 'error';
      case 'submitted':
        return 'info';
      case 'pending':
        return 'warning';
      default:
        return 'default';
    }
  };

  const formatAmount = (cents: number) => {
    return (cents / 100).toFixed(2).replace('.', ',') + ' €';
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Erstattungen</Typography>
        <Chip
          label={`${stats.pending} ausstehend`}
          color="warning"
          size="small"
        />
      </Box>
      
      {reimbursements.length === 0 ? (
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Keine ausstehenden Erstattungen
          </Typography>
        </Box>
      ) : (
        <List sx={{ flex: 1, overflow: 'auto' }}>
          {reimbursements.map((reimbursement) => (
            <ListItem
              key={reimbursement._id}
              sx={{
                cursor: 'pointer',
                '&:hover': { backgroundColor: 'action.hover' }
              }}
              onClick={() => navigate('/reimbursements')}
            >
              <ListItemIcon>
                {getStatusIcon(reimbursement.status)}
              </ListItemIcon>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" noWrap>
                      {reimbursement.patientId?.firstName} {reimbursement.patientId?.lastName}
                    </Typography>
                    <Chip
                      label={reimbursement.status}
                      color={getStatusColor(reimbursement.status) as any}
                      size="small"
                      sx={{ ml: 1 }}
                    />
                  </Box>
                }
                secondary={
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      {reimbursement.invoiceId?.invoiceNumber} • {formatAmount(reimbursement.requestedReimbursement)}
                    </Typography>
                    {reimbursement.submittedDate && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        {format(new Date(reimbursement.submittedDate), 'dd.MM.yyyy', { locale: de })}
                      </Typography>
                    )}
                  </Box>
                }
              />
            </ListItem>
          ))}
        </List>
      )}
      
      <Box sx={{ p: 1, borderTop: 1, borderColor: 'divider', textAlign: 'center' }}>
        <Typography
          variant="caption"
          color="primary"
          sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
          onClick={() => navigate('/reimbursements')}
        >
          Alle Erstattungen anzeigen
        </Typography>
      </Box>
    </Box>
  );
};

export default ReimbursementsWidget;

