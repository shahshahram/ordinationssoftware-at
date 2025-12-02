declare module '@ohif/viewer' {
  export interface OHIFConfig {
    routerBasename?: string;
    extensions?: any[];
    modes?: any[];
    showStudyList?: boolean;
    maxNumberOfWebWorkers?: number;
    showWarningMessageForCrossOrigin?: boolean;
    showCPUFallbackMessage?: boolean;
    strictZSpacingForVolumeViewport?: boolean;
    maxCacheSize?: number;
    servers?: {
      dicomWeb?: Array<{
        name: string;
        wadoUriRoot: string;
        qidoRoot: string;
        wadoRoot: string;
        qidoSupportsIncludeField?: boolean;
        supportsReject?: boolean;
        imageRendering?: string;
        thumbnailRendering?: string;
        enableStudyLazyLoad?: boolean;
        supportsFuzzyMatching?: boolean;
        supportsWildcard?: boolean;
      }>;
    };
    defaultDataSourceName?: string;
  }

  export function installViewer(
    config: OHIFConfig,
    containerId?: string | HTMLElement,
    callback?: () => void
  ): void;
}

