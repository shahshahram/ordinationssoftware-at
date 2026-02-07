import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../utils/api';

export interface WidgetThemeConfig {
  primaryColor: string;
  secondaryColor: string;
  background: string;
  fontFamily: string;
  layout: 'horizontal' | 'vertical';
  style: 'classic' | 'minimal' | 'modern';
}

const defaultConfig: WidgetThemeConfig = {
  primaryColor: '#1976d2',
  secondaryColor: '#dc004e',
  background: '#f5f5f5',
  fontFamily: 'Roboto',
  layout: 'vertical',
  style: 'modern',
};

function mergeConfigWithSearchParams(
  apiConfig: WidgetThemeConfig,
  searchParams: URLSearchParams
): WidgetThemeConfig {
  const primaryColor = searchParams.get('primaryColor') ?? apiConfig.primaryColor;
  const secondaryColor = searchParams.get('secondaryColor') ?? apiConfig.secondaryColor;
  const background = searchParams.get('background') ?? apiConfig.background;
  const fontFamily = searchParams.get('fontFamily') ?? apiConfig.fontFamily;
  const layoutParam = searchParams.get('layout');
  const layout = layoutParam === 'horizontal' ? 'horizontal' : layoutParam === 'vertical' ? 'vertical' : apiConfig.layout;
  const styleParam = searchParams.get('style');
  const style = ['classic', 'minimal', 'modern'].includes(styleParam ?? '') ? styleParam as WidgetThemeConfig['style'] : apiConfig.style;
  return {
    primaryColor,
    secondaryColor,
    background,
    fontFamily,
    layout,
    style,
  };
}

export const useWidgetThemeConfig = (doctorId?: string, locationId?: string) => {
  const [searchParams] = useSearchParams();
  const searchParamsRef = useRef(searchParams);
  searchParamsRef.current = searchParams;

  const [config, setConfig] = useState<WidgetThemeConfig>(defaultConfig);
  const [loading, setLoading] = useState(!!(doctorId || locationId));
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    const params = searchParamsRef.current;
    if (!doctorId && !locationId) {
      const merged = mergeConfigWithSearchParams(defaultConfig, params);
      setConfig(merged);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const apiParams = new URLSearchParams();
      if (locationId) apiParams.set('locationId', locationId);
      else if (doctorId) apiParams.set('doctorId', doctorId);
      const response = await api.get<{ success: boolean; data: WidgetThemeConfig }>(
        `/online-booking/widget-config?${apiParams.toString()}`
      );
      const raw = (response as { data?: { success?: boolean; data?: WidgetThemeConfig } }).data;
      const themeData = (raw?.data ?? raw) as WidgetThemeConfig | undefined;
      if (themeData && typeof themeData === 'object' && 'primaryColor' in themeData) {
        const apiConfig: WidgetThemeConfig = {
          primaryColor: themeData.primaryColor || defaultConfig.primaryColor,
          secondaryColor: themeData.secondaryColor || defaultConfig.secondaryColor,
          background: themeData.background || defaultConfig.background,
          fontFamily: themeData.fontFamily || defaultConfig.fontFamily,
          layout: themeData.layout === 'horizontal' ? 'horizontal' : 'vertical',
          style: ['classic', 'minimal', 'modern'].includes(themeData.style)
            ? themeData.style
            : defaultConfig.style,
        };
        const merged = mergeConfigWithSearchParams(apiConfig, params);
        setConfig(merged);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden der Widget-Konfiguration');
      setConfig(defaultConfig);
    } finally {
      setLoading(false);
    }
  }, [doctorId, locationId]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  return { config, loading, error, refetch: fetchConfig };
};
