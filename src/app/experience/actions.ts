import { Experience } from "./model/experience";

export namespace ExperienceAction {
    export class Open {
        static readonly type = '[Experience] Open experience';
        constructor(public exp: Experience, public isFirst = false) {}
    }

    export class Close {
        static readonly type = '[Experience] Close experience';
        constructor(public exp: Experience) {}
    }

    export class Add {
        static readonly type = '[Experience] Add experience';
        constructor(public exp: Experience) {}
    }

    export class Remove {
        static readonly type = '[Experience] Remove experience';
        constructor(public exp: Experience) {}
    }

    export class CreateSandbox {
        static readonly type = '[Experience] Add sandbox';
        constructor(public name: string) {}
    }

    export class UpdateExperience {
        static readonly type = '[Experience] Update experience';
        constructor(public exp: Experience) {}
    }

    export class RestoreLast {
        static readonly type = '[Experience] Restore last selection (if exists)';
        constructor() {}
    }

    export class ResetAvailability {
        static readonly type = '[Experience] Reset availability for lesson';
        constructor(public exp: Experience) {}
    }

    export class ChangeCurrent {
        static readonly type = '[Experience] Change current experience';
        constructor(public exp: Experience) {}
    }
}