declare module '!raw-loader!*' {
  const contents: string;
  export default contents;
}

declare function loadPyodide(config: { indexUrl: string }): Promise<any>;
