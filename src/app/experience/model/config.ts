import { ExperienceType } from "src/app/experience/model/experience-type";
import { SplitAreaSettings } from "src/app/viewer/model/split-settings";

export interface Config {
    open: { path: string, on: string, active: boolean }[],
    uuid: string;
    name: string;
    type: ExperienceType;
    splitSettings: {
        [area: string]: SplitAreaSettings; // info about sizes and visibility
    } 
    unityEntryPoint?: string;
    encrypted: string[]; // paths which will be encrypted upon export (config.json is always encrypted)
    hidden: string[]; // paths which will be hidden from the UI and (recursive)
    external: string[]; // paths which be mounted to a seperate mountpoint (read only, recursive) before pyodide execution and dismounted afterwards
    readonly: string[]; // paths which should be read only (recursive), e.g. lesson description
    modules?: string[]; // Optional: paths to our custom python modules; will be set to hidden and read-only if specified
    glossaryEntryPoint: string; // will be copied to global glossary scope (read only, recursive)
    hintRoot: string;
}
