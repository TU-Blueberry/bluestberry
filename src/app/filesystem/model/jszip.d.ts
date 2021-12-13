import 'jszip';

declare module 'jszip' {
    interface OutputByType {
        base64: string;
        string: string;
        text: string;
        binarystring: string;
        array: number[];
        uint8array: Uint8Array;
        arraybuffer: ArrayBuffer;
        blob: Blob;
        nodebuffer: Buffer;
    }

    // no idea why internalSteram is only described in the docs and not exposed in typescript
    // can't use nodeStream as an upate some time ago apparently broke it https://github.com/Stuk/jszip/issues/663
    interface JSZipObject {
        internalStream<T extends OutputType>(type: T): StreamHelper<T>;
    }

    interface StreamHelper<T extends OutputType> {
        accumulate(callback?: (metadata: Metadata) => void): Promise<OutputByType[T]>;
        on(type: string, callback: () => void): void;
        on(type: string, callback: (error: any) => void): void;
        on(type: string, callback: (data: OutputByType[T], metadata: Metadata) => void): void;
    }

    interface Metadata  {
        percent: number;
        currentFile: string;
    }
}