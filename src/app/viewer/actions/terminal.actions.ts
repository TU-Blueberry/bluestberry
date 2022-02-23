export namespace Terminal {
    export class Open {
        static readonly type = '[MainView] Open terminal';
        constructor() {}
    }

    export class Close {
        static readonly type = '[MainView] Close terminal';
        constructor() {}
    }
}