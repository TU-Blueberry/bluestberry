import { Injectable } from "@angular/core";
import { Action, State, StateContext } from "@ngxs/store";
import { concat, EMPTY, Observable } from "rxjs";
import { finalize, ignoreElements, last, switchMap, take } from "rxjs/operators";
import { AppAction } from "../app.actions";
import { ConfigService } from "../shared/config/config.service";
import { ExperienceAction } from "./actions";
import { ExperienceManagementService } from "./experience-management/experience-management.service";
import { Experience } from "./model/experience";

export interface ExperienceStateModel {
    current?: Experience;
    lessons: Experience[];
    sandboxes: Experience[];
}

@State<ExperienceStateModel>({
    name: 'experiences', 
    defaults: {
        lessons: [],
        sandboxes: []
    }
})

@Injectable()
export class ExperienceState {
    constructor(private expMgmt: ExperienceManagementService, private conf: ConfigService) {}

    @Action(ExperienceAction.CreateSandbox)
    onSandboxCreate(ctx: StateContext<ExperienceStateModel>, action: ExperienceAction.CreateSandbox) {
        return this.expMgmt.createAndStoreSandbox(action.name).pipe(
            last(),
            switchMap(exp => {
                return ctx.dispatch([new ExperienceAction.Add(exp), new ExperienceAction.Open(exp)])
            })
        )
    }

    @Action(ExperienceAction.Add)
    onExperienceAdded(ctx: StateContext<ExperienceStateModel>, action: ExperienceAction.Add) {
        const state = ctx.getState();
        const key = action.exp.type === 'LESSON' ? 'lessons' : 'sandboxes';
        const elements = this.clone(state[key]);

        // don't add duplicates
        if (elements.findIndex(exp => exp.uuid === action.exp.uuid) === -1) {
            elements.push(action.exp);

            ctx.setState({
                ...state,
                [key]: elements
            })
        }
    }

    @Action(ExperienceAction.Open)
    onExperienceOpened(ctx: StateContext<ExperienceStateModel>, action: ExperienceAction.Open) {
        const state = ctx.getState();
        let obsv: Observable<any>;

        ctx.dispatch(new AppAction.Change('SWITCHING'));

        if (state.current !== undefined && !action.isFirst) {
            obsv = concat(
                state.current.uuid !== '' ? 
                  ctx.dispatch(new ExperienceAction.Close(state.current)) : 
                  EMPTY,
                action.exp.type === 'LESSON' ? 
                  this.expMgmt.openLesson(action.exp) : 
                  this.expMgmt.openExistingExperience(action.exp)
              );

        } else {
            obsv = action.exp.type === 'LESSON' ? 
                this.expMgmt.openLesson(action.exp) : 
                this.expMgmt.openSandbox(action.exp);
        }
        
        return obsv.pipe(
            finalize(() => {
                ctx.dispatch([
                    new AppAction.Change("READY"), 
                    new ExperienceAction.UpdateExperience(action.exp)
                ]);
            })
        );
    }

    @Action(ExperienceAction.Close)
    onExperienceClosed(ctx: StateContext<ExperienceStateModel>, action: ExperienceAction.Close) {
        const state = ctx.getState();

        return concat(
            this.conf.saveStateOfCurrentExperience(),
            this.expMgmt.closeExperience(action.exp, false)
        ).pipe(
            finalize(() => {
                ctx.setState({
                    ...state,
                    current: undefined
                })
            })
        )
    }

    @Action(ExperienceAction.Remove)
    onExperienceRemoved(ctx: StateContext<ExperienceStateModel>, action: ExperienceAction.Remove) {
        const state = ctx.getState();
        const key = action.exp.type === 'LESSON' ? 'lessons' : 'sandboxes';
        const elements = this.clone(state[key]);
        const index = elements.findIndex(e => e.uuid === action.exp.uuid);
        const isMounted = (state.current !== undefined && (state.current.uuid === action.exp.uuid));

        return this.expMgmt.deleteSandbox(isMounted, action.exp).pipe(
            finalize(() => {
                let newCurrentElement = undefined;

                if (index > -1) {
                    elements.splice(index, 1);
                 
                    // keep current element if it isn't the one which was removed
                    if (!(state.current && state.current.uuid === action.exp.uuid)) {
                        newCurrentElement = state.current;
                    }
                    
                    ctx.setState({
                        ...state,
                        [key]: elements,
                        current: newCurrentElement
                    })

                    if (!newCurrentElement) {
                        // TODO: check if lessons actually contains something, else take random sandbox or dummy
                        ctx.dispatch(new ExperienceAction.Open(state.lessons[0]));
                    }
                }
            })
        )
    }

    @Action(ExperienceAction.UpdateExperience)
    onExperienceUpdated(ctx: StateContext<ExperienceStateModel>, action: ExperienceAction.UpdateExperience) {
        const state = ctx.getState();
        const key = action.exp.type === 'LESSON' ? 'lessons' : 'sandboxes';
        const elements = this.clone(state[key]);
        const index = elements.findIndex(e => e.uuid === action.exp.uuid);

        if (index > -1) {
            elements[index] = { ...action.exp, availableOffline: true };

            ctx.setState({
                ...state,
                [key]: elements,
                current: action.exp
            })
        }
    }

    @Action(ExperienceAction.RestoreLast)
    onRestoreLast(ctx: StateContext<ExperienceStateModel>, action: ExperienceAction.RestoreLast) {
        const state = ctx.getState();
        ctx.dispatch(new AppAction.Change("LOADING"));

        if (state.current === undefined) {
            if (state.lessons.length > 0) {
                ctx.dispatch(new ExperienceAction.Open(state.lessons[0]))
            } else if (state.sandboxes.length > 0) {
                ctx.dispatch(new ExperienceAction.Open(state.sandboxes[0]));
            } else {
                console.log("TODO case");
                // TODO: Dummy lesson?
            }
        } else {
            ctx.dispatch(new ExperienceAction.Open(state.current, true));
        }
    }

    @Action(ExperienceAction.ResetAvailability)
    onResetAvailability(ctx: StateContext<ExperienceStateModel>, action: ExperienceAction.ResetAvailability) {
        const state = ctx.getState();
        const key = action.exp.type === 'LESSON' ? 'lessons' : 'sandboxes';
        const elements = this.clone(state[key]);

        const index = elements.findIndex(element => element.uuid === action.exp.uuid);

        if (index > -1) {
            elements[index].availableOffline = false
        }

        ctx.setState({
            ...state,
            [key]: elements
        })
    }

    private clone(exps: Experience[]): Experience[] {
        return [...exps];
    }
}