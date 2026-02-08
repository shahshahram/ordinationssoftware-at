import React from 'react';
import { Box, Typography, useMediaQuery, useTheme } from '@mui/material';
import { LineChart, BarChart, PieChart } from '@mui/x-charts';
import { DashboardWidget } from '../../store/slices/dashboardWidgetsSlice';

interface ChartWidgetProps {
  widget: DashboardWidget;
  data?: {
    chartType: 'line' | 'bar' | 'pie';
    data: Array<{ label: string; value: number }>;
    xAxisLabel?: string;
    yAxisLabel?: string;
  };
  noWrapper?: boolean;
}

const ChartWidget: React.FC<ChartWidgetProps> = ({ widget, data, noWrapper = false }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const chartType = data?.chartType || widget.config?.chartType || 'line';
  const chartData = data?.data || widget.config?.data || [];

  const renderChart = () => {
    if (chartData.length === 0) {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', p: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Keine Daten verfügbar
          </Typography>
        </Box>
      );
    }

    // Responsive Chart-Größen - verwende feste Zahlen für Charts
    const width = isMobile ? 300 : 400;
    const height = isMobile ? 200 : 250;

    switch (chartType) {
      case 'line':
        return (
          <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', overflow: 'auto' }}>
            <LineChart
              width={width}
              height={height}
              series={[
                {
                  data: chartData.map((d: { label: string; value: number }) => d.value),
                  label: widget.title,
                  color: theme.palette.primary.main,
                },
              ]}
              xAxis={[{
                scaleType: 'point',
                data: chartData.map((d: { label: string; value: number }) => d.label),
              }]}
            />
          </Box>
        );
      case 'bar':
        return (
          <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', overflow: 'auto' }}>
            <BarChart
              width={width}
              height={height}
              series={[
                {
                  data: chartData.map((d: { label: string; value: number }) => d.value),
                  label: widget.title,
                  color: theme.palette.primary.main,
                },
              ]}
              xAxis={[{
                scaleType: 'band',
                data: chartData.map((d: { label: string; value: number }) => d.label),
              }]}
            />
          </Box>
        );
      case 'pie':
        return (
          <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', overflow: 'auto' }}>
            <PieChart
              width={width}
              height={height}
              series={[
                {
                  data: chartData.map((d: { label: string; value: number }, index: number) => ({
                    id: index,
                    value: d.value,
                    label: d.label,
                  })),
                  innerRadius: 30,
                  outerRadius: 100,
                },
              ]}
            />
          </Box>
        );
      default:
        return null;
    }
  };

  return (
    <Box sx={{ 
      minHeight: noWrapper ? 0 : '100%',
      height: noWrapper ? '100%' : 'auto',
      width: noWrapper ? '100%' : undefined,
      display: 'flex', 
      flexDirection: 'column', 
      p: noWrapper ? 0 : { xs: 1.5, sm: 3 },
      flex: noWrapper ? 1 : undefined,
      overflow: noWrapper ? 'hidden' : undefined,
    }}>
      {!noWrapper && (
        <Typography 
          variant={isMobile ? 'subtitle1' : 'h6'} 
          gutterBottom 
          sx={{ fontWeight: 600, mb: { xs: 1, sm: 2 } }}
        >
          {widget.title}
        </Typography>
      )}
      <Box 
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          overflow: 'auto',
          width: '100%',
          flex: noWrapper ? 1 : undefined,
          minHeight: noWrapper ? 0 : (isMobile ? 200 : 250)
        }}
      >
        {renderChart()}
      </Box>
    </Box>
  );
};

export default ChartWidget;

