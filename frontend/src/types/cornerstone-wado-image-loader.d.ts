declare module 'cornerstone-wado-image-loader' {
  import * as cornerstone from 'cornerstone-core';
  import * as dicomParser from 'dicom-parser';

  export const external: {
    cornerstone: typeof cornerstone;
    dicomParser: typeof dicomParser;
  };

  export const webWorkerManager: {
    initialize: (config: {
      maxWebWorkers?: number;
      startWebWorkersOnDemand?: boolean;
      taskConfiguration?: {
        decodeTask?: {
          initializeCodecsOnStartup?: boolean;
          usePDFJS?: boolean;
          strict?: boolean;
        };
      };
    }) => void;
  };

  export function loadImage(imageId: string): Promise<any>;
}















