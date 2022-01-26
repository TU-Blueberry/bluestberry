import { ExperienceType } from "./experience-type";

export interface Experience {
    uuid: string;
    name: string;
    type: ExperienceType;
    availableOffline?: boolean;
}