import { ExperienceType } from "src/app/experience/model/experience-type";
import { ViewSettings } from "src/app/viewer/model/view-settings";

export interface Config {
    open: { path: string, on: string, active: boolean }[],
    uuid: string;
    name: string;
    type: ExperienceType;
    splitSettings: ViewSettings; // info about sizes and visibility
    unityEntryPoint?: string;
    hidden: string[]; // paths which will be hidden from the UI and (recursive)
    readonly: string[]; // paths which should be read only (recursive), e.g. lesson description
    modules: string[]; // paths to our custom python modules; will be set to hidden and read-only if specified
    glossaryEntryPoint: string; // will be copied to global glossary scope (read only, recursive)
    hintRoot: string;
    preloadPythonLibs: string[];
    tabinfo: string;

    // options we envisioned but didn't get to implement
    encrypted: string[]; // paths which will be encrypted upon export (config.json is always encrypted)
    external: string[]; // paths which will be mounted to a seperate mountpoint (read only, recursive) before every pyodide execution and dismounted afterwards
}
