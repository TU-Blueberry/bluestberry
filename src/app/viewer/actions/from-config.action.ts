import { ViewSettings } from "../model/view-settings";

export class FromConfig {
    static readonly type = '[MainView] Load options from config';
    constructor(public splitSettings: ViewSettings, public openTabs: { path: string, on: string, active: boolean }[]) {}
}