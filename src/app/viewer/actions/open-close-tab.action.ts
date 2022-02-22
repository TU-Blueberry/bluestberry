export class OpenCloseTab {
    static readonly type = '[MainView] TabGroup opened/closed';
    constructor(public changes: { group: string, visible: boolean }, public group: number) {} 
}