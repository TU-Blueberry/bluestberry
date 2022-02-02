import { Tab } from "../model/tab.model";

export class ActiveChange {
    static readonly type = '[Tab] Active tab was changed'
    constructor(public groupId: string, public activeTab?: Tab) {}
}