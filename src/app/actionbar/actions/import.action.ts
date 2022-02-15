import { Experience } from "src/app/experience/model/experience";

export namespace ImportAction {
    export class OverwriteCurrent {
        static readonly type = '[Import] Overwrite current exp with files from archive';
        constructor(public exp: Experience) {}
    }

    export class OpenImportWindow {
        static readonly type = '[Import] Open modal'
        constructor() {}
    }

    export class CloseImportWindow {
        static readonly type = '[Import] Close modal'
        constructor() {}
    }
}