declare module '!raw-loader!*' {
  const contents: string;
  export default contents;
}

declare function loadPyodide(
  config: {
    indexURL: string,
    fullStdLib?: boolean;
    stdin?: () => string;
    stdout?: (text: string) => void;
    stderr?: (text: string) => void;
  }
): Promise<Pyodide>;

declare interface AnalyzeObject {
  isRoot: boolean,
  exists: boolean,
  error: Error,
  name: string,
  path: string,
  object: FSNode,
  parentExists: boolean,
  parentPath: string,
  parentObject: FSNode
}

declare class FSNode {
  contents: FSNode | Uint8Array
  mode: number;
  id: number;
  name: string;
  parent: FSNode;
  timestamp: number;
}

declare interface FSTypes {
  IDBFS: any;
}

type allowedEncodings = "binary" | "utf8";

declare class MissingInEmscripten {
  filesystems: FSTypes;
  analyzePath(path: string, dontResolveLastLink: boolean): AnalyzeObject;
  readFile(path: string, opts: { encoding: allowedEncodings; flags?: string | undefined }): Uint8Array | string;
}

declare class Pyodide {
  FS: typeof FS & MissingInEmscripten;
  globals: Map<string, any>;

  runPythonAsync(code: string): Promise<any>;
  loadPackage(pythonPackage: string): Promise<any>;
  toPy(obj: any, options?: {depth: number}): PyProxy;
  loadPackagesFromImports(code: string, messageCallback?: (message: string) => void, errorCallback?: (error: any) => void): Promise<any>;
  setInterruptBuffer(interruptBuffer: SharedArrayBuffer): void;
}

declare class PyProxy {

}

