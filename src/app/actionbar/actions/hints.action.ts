export namespace Hints {
    export class Open {
        static readonly type = '[Actionbar] Open hints'
        constructor() {}
    }

    export class Close {
        static readonly type = '[Actionbar] Close hints'
        constructor() {}
    }

    export class Inactive {
        static readonly type = '[Actionbar] Hints now inactive (switched to different tab)'
        constructor() {}
    }

    export class Active {
        static readonly type = '[Actionbar] Hints now active again'
        constructor() {}
    }
}
