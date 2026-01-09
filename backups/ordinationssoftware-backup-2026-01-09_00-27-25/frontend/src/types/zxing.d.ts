declare module '@zxing/library' {
  export class BrowserMultiFormatReader {
    constructor();
    decodeFromVideoDevice(
      deviceId: string | null,
      videoElement: HTMLVideoElement,
      callback: (result: any, error: any) => void
    ): Promise<void>;
    reset(): void;
  }
}







