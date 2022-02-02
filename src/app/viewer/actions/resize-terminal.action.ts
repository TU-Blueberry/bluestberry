export class ResizeTerminal {
    static readonly type = '[Terminal] Resize';
    constructor(public updatedSizes: number[], public group: number) {}
}
