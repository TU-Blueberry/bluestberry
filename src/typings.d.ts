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
  contents: FSNode   
  mode: number;
  id: number;
  name: string;
  parent: FSNode;
  timestamp: number;
}

declare interface FSTypes {
  IDBFS: any;
}

declare class MissingInEmscripten {
  filesystems: FSTypes;
  analyzePath(path: string, dontResolveLastLink: boolean): AnalyzeObject;
}

declare class Pyodide {
  globals: Map<string, any>;
  runPythonAsync(code: string): Promise<any>;
  loadPackage(pythonPackage: string): Promise<any>;
  FS: typeof FS & MissingInEmscripten;
  toPy(obj: any, options?: {depth: number}): PyProxy;
}

declare class PyProxy {

}

