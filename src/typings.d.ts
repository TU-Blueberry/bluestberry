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

declare class Pyodide {
  globals: Map<string, any>;
  runPythonAsync(code: string): Promise<any>;
  loadPackage(pythonPackage: string): Promise<any>;
}
