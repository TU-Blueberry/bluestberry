export class ResizeMain {
    static readonly type = '[MainView] Resize';
    constructor(public updatedSizes: number[], public groupId: number) {}
}
