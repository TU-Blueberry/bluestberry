import { SplitSettings } from "../model/split-sizes";

export class FromConfig {
    static readonly type = '[MainView] Load options from config';
    constructor(public splitSettings: SplitSettings, public openTabs: { path: string, on: string, active: boolean }[]) {}
}