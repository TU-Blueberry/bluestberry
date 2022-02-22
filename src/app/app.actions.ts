import { AppStatus } from "./app.state";

export namespace AppAction {
    export class Change {
        static readonly type = '[App] Change status';
        constructor(public status: AppStatus) {}
    }
}