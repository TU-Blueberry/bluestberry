export namespace Filetree {
    export class Open {
        static readonly type = '[Actionbar] Open filetree';
        constructor(public group: number) {}
    }

    export class Close {
        static readonly type = '[Actionbar] Close filetree';
        constructor(public group: number) {}
    }
}   