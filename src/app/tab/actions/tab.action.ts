import { Tab } from "../model/tab.model";

export class TabChange {
    static readonly type = '[Tab] Tab opened/closed';
    constructor (public id: string, public tabs: Tab[]) {}
}