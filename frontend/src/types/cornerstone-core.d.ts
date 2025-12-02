declare module 'cornerstone-core' {
  export interface Image {
    imageId: string;
    minPixelValue: number;
    maxPixelValue: number;
    slope: number;
    intercept: number;
    windowCenter: number;
    windowWidth: number;
    render: (enabledElement: any, invalidated?: boolean) => void;
    getPixelData: () => Uint16Array | Int16Array | Uint8Array | Int8Array;
    rows: number;
    columns: number;
    height: number;
    width: number;
    color: boolean;
    columnPixelSpacing?: number;
    rowPixelSpacing?: number;
    sizeInBytes: number;
  }

  export interface Viewport {
    scale: number;
    translation: {
      x: number;
      y: number;
    };
    voiLUT?: any;
    voi?: {
      windowCenter?: number;
      windowWidth?: number;
    };
    invert: boolean;
    pixelReplication: boolean;
    rotation: number;
    hflip: boolean;
    vflip: boolean;
    modalityLUT?: any;
    colormap?: any;
  }

  export interface EnabledElement {
    element: HTMLElement;
    image: Image;
    canvas: HTMLCanvasElement;
    viewport: Viewport;
    invalid: boolean;
    needsRedraw: boolean;
    layers?: any[];
  }

  export function enable(element: HTMLElement | HTMLCanvasElement, options?: any): Promise<void>;
  export function disable(element: HTMLElement | HTMLCanvasElement): void;
  export function loadImage(imageId: string): Promise<Image>;
  export function displayImage(element: HTMLElement | HTMLCanvasElement, image: Image, viewport?: Viewport): void;
  export function getDefaultViewportForImage(canvas: HTMLElement | HTMLCanvasElement, image: Image): Viewport;
  export function setViewport(element: HTMLElement | HTMLCanvasElement, viewport: Viewport): void;
  export function getViewport(element: HTMLElement | HTMLCanvasElement): Viewport;
  export function getImage(imageId: string): Promise<Image>;
  export function registerImageLoader(scheme: string, imageLoader: (imageId: string, options?: any) => Promise<Image>): void;
  export function drawImage(enabledElement: EnabledElement, invalidated?: boolean): void;
  export function resize(element: HTMLElement | HTMLCanvasElement, force?: boolean): void;
  export function updateImage(element: HTMLElement | HTMLCanvasElement): void;
  export function getEnabledElement(element: HTMLElement | HTMLCanvasElement): EnabledElement | undefined;
  export function renderGrayscaleImage(enabledElement: EnabledElement, invalidated?: boolean): void;
  export function reset(element: HTMLElement | HTMLCanvasElement): void;
}
