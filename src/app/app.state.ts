import { Injectable } from "@angular/core";
import { Action, State, StateContext } from "@ngxs/store";
import { AppAction } from "./app.actions";

export interface AppStateModel {
    status: AppStatus;
}

// init = pyodide etc. wird gerade geladen
// Ready = pyodide etc geladen
export type AppStatus = "INITIALIZING" | "SWITCHING" | "READY" | "ERROR" | "LOADING" | "IMPORTING";

@State<AppStateModel>({
    name: 'app', 
    defaults: {
        status: "INITIALIZING"
    }
})

@Injectable()
export class AppState {

    @Action(AppAction.Change)
    onStatusChanged(ctx: StateContext<AppStateModel>, action: AppAction.Change) {
        ctx.setState({
            status: action.status
        })  
    }
}