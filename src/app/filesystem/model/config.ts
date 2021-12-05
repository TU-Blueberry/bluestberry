export interface ConfigObject {
    open: { path: string, on: string}[];
    name: string;
    unityEntryPoint: string;
    encrypted: string[]; // paths which will be encrypted upon export (config.json is always encrypted)
    hidden: string[]; // paths which will be hidden from the UI and (read only, recursive)
    external: string[]; // paths which be mounted to a seperate mountpoint (read only, recursive) before pyodide execution and dismounted afterwards
    readonly: string[]; // paths which should be read only (recursive), e.g. lesson description
    modules: string[]; // paths to our custom python modules (hidden and read-only)
    glossaryEntryPoint: string; // will be copied to global glossary scope (read only, recursive)
}
