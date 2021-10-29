declare module '!raw-loader!*' {
  const contents: string;
  export default contents;
}

declare function loadPyodide(config: { indexURL: string }): Promise<any>;
