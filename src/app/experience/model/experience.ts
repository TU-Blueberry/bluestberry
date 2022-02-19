import { ExperienceType } from "./experience-type";

export interface Experience {
    uuid: string;
    name: string;
    type: ExperienceType;
    preloadedPythonLibs?: string[],
    availableOffline?: boolean;
}