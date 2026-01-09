declare module 'qrcode' {
  interface QRCodeOptions {
    width?: number;
    margin?: number;
    color?: {
      dark?: string;
      light?: string;
    };
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  }

  function toCanvas(
    canvas: HTMLCanvasElement,
    text: string,
    options?: QRCodeOptions
  ): Promise<void>;

  function toString(
    text: string,
    options?: QRCodeOptions
  ): Promise<string>;

  function toDataURL(
    text: string,
    options?: QRCodeOptions
  ): Promise<string>;

  const QRCode: {
    toCanvas: typeof toCanvas;
    toString: typeof toString;
    toDataURL: typeof toDataURL;
  };

  export = QRCode;
}







